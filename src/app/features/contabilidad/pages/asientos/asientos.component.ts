import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { AsientoService } from '../../services/asiento.service';
import { CuentaService, CuentaContable } from '../../services/cuenta.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { Asiento, AsientoRequest, MovimientoRequest } from '../../models/asiento.model';

interface LineaForm {
    cuentaId: string;
    codigoCuenta: string;
    nombreCuenta: string;
    debe: number;
    haber: number;
    glosa: string;
}

@Component({
    selector: 'app-asientos',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, FormsModule, DrawerComponent, DataTableComponent],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Asientos Contables</h1>
                <p class="page-subtitle">PCGE 2020 · Partida doble</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" (click)="abrirForm()" [disabled]="!periodoSeleccionado()">
                    + Nuevo Asiento
                </button>
            </div>
        </div>

        <!-- ── DRAWER FORMULARIO NUEVO ASIENTO ──────────────────────────────── -->
        <app-drawer
            [isOpen]="mostrarForm()"
            title="Nuevo Asiento Contable"
            size="lg"
            side="right"
            [hasFooter]="true"
            (closed)="cerrarForm()">

            <!-- Cabecera del asiento -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label class="input-label">Fecha *</label>
                    <input type="date" class="input-field" [(ngModel)]="form.fecha" required>
                </div>
                <div>
                    <label class="input-label">Tipo *</label>
                    <select class="input-field" [(ngModel)]="form.tipo">
                        <option value="MANUAL">Manual</option>
                        <option value="CIERRE">Cierre</option>
                    </select>
                </div>
                <div>
                    <label class="input-label">Glosa *</label>
                    <input type="text" class="input-field" [(ngModel)]="form.glosa"
                           placeholder="Descripción del asiento" maxlength="250">
                </div>
            </div>

            <!-- Líneas de movimiento -->
            <div class="overflow-x-auto mb-4">
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th class="table-header-cell w-36">Cuenta</th>
                            <th class="table-header-cell">Descripción</th>
                            <th class="table-header-cell">Glosa línea</th>
                            <th class="table-header-cell text-right w-32">Debe (S/)</th>
                            <th class="table-header-cell text-right w-32">Haber (S/)</th>
                            <th class="table-header-cell w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (l of lineas(); track $index; let i = $index) {
                        <tr class="table-row">
                            <!-- Selector cuenta con autocompletado -->
                            <td class="table-cell p-1">
                                <div class="relative">
                                    <input type="text" class="input-field font-mono text-sm py-1"
                                           [(ngModel)]="l.codigoCuenta"
                                           (ngModelChange)="onCodigoCuentaChange(i, $event)"
                                           (blur)="buscarCuenta(i)"
                                           placeholder="ej. 121"
                                           autocomplete="off">
                                    @if (sugerencias()[i]?.length) {
                                    <div class="absolute z-50 left-0 top-full w-64 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        @for (c of sugerencias()[i]; track c.id) {
                                        <div class="px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface)] flex gap-2"
                                             (mousedown)="seleccionarCuenta(i, c)">
                                            <span class="font-mono text-[var(--color-primary)]">{{ c.codigo }}</span>
                                            <span class="text-subtle truncate">{{ c.nombre }}</span>
                                        </div>
                                        }
                                    </div>
                                    }
                                </div>
                            </td>
                            <td class="table-cell p-1">
                                <input type="text" class="input-field text-sm py-1" [(ngModel)]="l.nombreCuenta"
                                       placeholder="Nombre cuenta" readonly>
                            </td>
                            <td class="table-cell p-1">
                                <input type="text" class="input-field text-sm py-1" [(ngModel)]="l.glosa"
                                       placeholder="Detalle...">
                            </td>
                            <td class="table-cell p-1">
                                <input type="number" class="input-field text-sm py-1 text-right font-mono"
                                       [(ngModel)]="l.debe" min="0" step="0.01"
                                       (ngModelChange)="onDebeChange(i)">
                            </td>
                            <td class="table-cell p-1">
                                <input type="number" class="input-field text-sm py-1 text-right font-mono"
                                       [(ngModel)]="l.haber" min="0" step="0.01"
                                       (ngModelChange)="onHaberChange(i)">
                            </td>
                            <td class="table-cell p-1 text-center">
                                @if (lineas().length > 2) {
                                    <button class="btn-icon btn-icon-delete" (click)="eliminarLinea(i)" title="Eliminar">✕</button>
                                }
                            </td>
                        </tr>
                        }
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-[var(--color-border)]">
                            <td colspan="3" class="table-cell">
                                <button class="btn btn-secondary text-sm py-1" (click)="agregarLinea()">
                                    + Agregar línea
                                </button>
                            </td>
                            <td class="table-cell text-right font-mono font-bold">
                                {{ totalDebe() | number:'1.2-2' }}
                            </td>
                            <td class="table-cell text-right font-mono font-bold">
                                {{ totalHaber() | number:'1.2-2' }}
                            </td>
                            <td></td>
                        </tr>
                        <!-- Verificación partida doble -->
                        <tr>
                            <td colspan="6" class="table-cell pt-2">
                                @if (totalDebe() === 0 && totalHaber() === 0) {
                                    <span class="text-subtle text-sm">Ingresa montos en las líneas de debe y haber</span>
                                } @else if (cuadra()) {
                                    <span class="text-sm font-semibold" style="color:var(--color-success)">
                                        ✓ Partida doble balanceada — DEBE = HABER = S/ {{ totalDebe() | number:'1.2-2' }}
                                    </span>
                                } @else {
                                    <span class="text-sm font-semibold" style="color:var(--color-error)">
                                        ⚠ Diferencia: S/ {{ diferencia() | number:'1.2-2' }} — el asiento no cuadra
                                    </span>
                                }
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            @if (errorForm()) {
                <p class="mt-3 text-sm" style="color:var(--color-error)">{{ errorForm() }}</p>
            }

            <!-- Footer del drawer -->
            <div slot="footer">
                @if (guardando()) {
                    <span class="text-subtle text-sm flex items-center gap-2">
                        <div class="spinner spinner-sm"></div> Guardando...
                    </span>
                } @else {
                    <button class="btn btn-secondary" (click)="cerrarForm()">Cancelar</button>
                    <button class="btn btn-secondary" (click)="guardar('BORRADOR')"
                            [disabled]="!formularioValido()">
                        Guardar Borrador
                    </button>
                    <button class="btn btn-primary" (click)="guardar('DEFINITIVO')"
                            [disabled]="!formularioValido() || !cuadra()">
                        Aprobar y Contabilizar
                    </button>
                }
            </div>
        </app-drawer>

        <!-- ── LISTA DE ASIENTOS ─────────────────────────────────────────────── -->
        <div class="card">
            <div class="card-header">
                <div class="filters-bar">
                    <select class="select-filter" [value]="periodoSeleccionado()"
                            (change)="cambiarPeriodo(periodoSelect.value)"
                            #periodoSelect>
                        <option value="">— Seleccionar periodo —</option>
                        @for (p of periodos(); track p.id) {
                            <option [value]="p.id">{{ p.nombre }} ({{ p.estado }})</option>
                        }
                    </select>
                    <select class="select-filter" [(ngModel)]="tipoFiltro" (change)="cargarAsientos()">
                        <option value="">Tipo ▼</option>
                        <option value="MANUAL">Manual</option>
                        <option value="AUTOMATICO">Automático</option>
                        <option value="CIERRE">Cierre</option>
                    </select>
                </div>
            </div>

            <app-data-table
                [data]="asientos()"
                [columns]="columns"
                [actions]="tableActions"
                [loading]="cargando()"
                [currentPage]="currentPage()"
                [pageSize]="pageSize()"
                [totalElements]="asientos().length"
                [totalPages]="totalPagesLocal()"
                (pageChange)="onPaginationChange($event)">
            </app-data-table>
        </div>
    `
})
export class AsientosComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private cuentaService = inject(CuentaService);
    private periodoService = inject(PeriodoService);
    private auth = inject(AuthService);

    // ── Lista ──────────────────────────────────────────────────────────────
    readonly asientos = signal<Asiento[]>([]);
    readonly periodos = signal<PeriodoContable[]>([]);
    readonly periodoSeleccionado = signal<string>('');
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    tipoFiltro = '';

    // ── Paginación local ───────────────────────────────────────────────────
    readonly currentPage = signal(0);
    readonly pageSize = signal(10);
    readonly totalPagesLocal = computed(() => Math.ceil(this.asientos().length / this.pageSize()) || 1);

    // ── Formulario ─────────────────────────────────────────────────────────
    readonly mostrarForm = signal(false);
    readonly guardando = signal(false);
    readonly errorForm = signal<string | null>(null);
    readonly lineas = signal<LineaForm[]>([]);
    readonly sugerencias = signal<CuentaContable[][]>([]);
    readonly todasCuentas = signal<CuentaContable[]>([]);

    form = {
        fecha: new Date().toISOString().substring(0, 10),
        glosa: '',
        tipo: 'MANUAL',
    };

    readonly totalDebe = computed(() => this.lineas().reduce((s, l) => s + (Number(l.debe) || 0), 0));
    readonly totalHaber = computed(() => this.lineas().reduce((s, l) => s + (Number(l.haber) || 0), 0));
    readonly diferencia = computed(() => Math.abs(this.totalDebe() - this.totalHaber()));
    readonly cuadra = computed(() => this.totalDebe() > 0 && this.diferencia() < 0.01);
    readonly formularioValido = computed(() =>
        !!this.form.fecha && !!this.form.glosa.trim() &&
        this.lineas().some(l => (Number(l.debe) || 0) > 0 || (Number(l.haber) || 0) > 0)
    );

    // ── Columnas DataTable ─────────────────────────────────────────────────
    readonly columns: TableColumn<Asiento>[] = [
        {
            key: 'codigo',
            label: 'Código',
            sortable: true,
            width: '150px',
            render: (r) => `<span class="font-mono font-bold">${r.codigo}</span>`,
            html: true
        },
        {
            key: 'fecha',
            label: 'Fecha',
            sortable: true,
            width: '110px',
            render: (r) => new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE')
        },
        { key: 'glosa', label: 'Descripción' },
        {
            key: 'tipo',
            label: 'Tipo',
            html: true,
            render: (r) => `<span class="badge badge-neutral">${r.tipo}</span>`
        },
        {
            key: 'origen',
            label: 'Origen',
            html: true,
            render: (r) => `<span class="badge badge-neutral text-xs">${r.origen}</span>`
        },
        {
            key: 'totalDebe',
            label: 'Debe (S/)',
            align: 'right',
            render: (r) => `<span class="font-mono">S/ ${r.totalDebe.toFixed(2)}</span>`,
            html: true
        },
        {
            key: 'totalHaber',
            label: 'Haber (S/)',
            align: 'right',
            render: (r) => `<span class="font-mono">S/ ${r.totalHaber.toFixed(2)}</span>`,
            html: true
        },
        {
            key: 'estado',
            label: 'Estado',
            html: true,
            render: (r) => `<span class="${this.estadoBadge(r.estado)}">${r.estado}</span>`
        },
    ];

    // ── Acciones DataTable ─────────────────────────────────────────────────
    readonly tableActions: TableAction<Asiento>[] = [
        {
            label: 'Cerrar',
            class: 'btn-icon btn-icon-delete',
            show: (r) => r.estado !== 'CERRADO' && r.estado !== 'DEFINITIVO',
            onClick: (r) => this.cerrarAsiento(r)
        }
    ];

    ngOnInit() { this.cargarPeriodos(); }

    private cargarPeriodos() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargarAsientos();
                }
            },
            error: () => this.error.set('No se pudieron cargar los periodos')
        });
        // Pre-cargar cuentas para el autocompletado
        this.cuentaService.listarTodas().subscribe({
            next: (c) => this.todasCuentas.set(c),
            error: () => this.error.set('No se pudieron cargar las cuentas contables')
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        if (id) this.cargarAsientos();
        else this.asientos.set([]);
    }

    cargarAsientos() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerAsientos(periodoId).subscribe({
            next: (lista) => { this.asientos.set(lista); this.cargando.set(false); },
            error: () => { this.error.set('Error al cargar asientos'); this.cargando.set(false); }
        });
    }

    // ── Formulario helpers ─────────────────────────────────────────────────
    abrirForm() {
        this.lineas.set([
            this.lineaVacia(),
            this.lineaVacia(),
        ]);
        this.sugerencias.set([[], []]);
        this.form = { fecha: new Date().toISOString().substring(0, 10), glosa: '', tipo: 'MANUAL' };
        this.errorForm.set(null);
        this.mostrarForm.set(true);
    }

    cerrarForm() { this.mostrarForm.set(false); }

    agregarLinea() {
        this.lineas.update(l => [...l, this.lineaVacia()]);
        this.sugerencias.update(s => [...s, []]);
    }

    eliminarLinea(i: number) {
        this.lineas.update(l => l.filter((_, idx) => idx !== i));
        this.sugerencias.update(s => s.filter((_, idx) => idx !== i));
    }

    onDebeChange(i: number) {
        // Cuando se ingresa debe, limpiar haber de esa línea
        const ls = [...this.lineas()];
        if ((Number(ls[i].debe) || 0) > 0) ls[i].haber = 0;
        this.lineas.set(ls);
    }

    onHaberChange(i: number) {
        const ls = [...this.lineas()];
        if ((Number(ls[i].haber) || 0) > 0) ls[i].debe = 0;
        this.lineas.set(ls);
    }

    onCodigoCuentaChange(i: number, valor: string) {
        const ls = [...this.lineas()];
        ls[i].codigoCuenta = valor;
        ls[i].cuentaId = '';
        ls[i].nombreCuenta = '';
        this.lineas.set(ls);

        // Filtrar sugerencias locales
        if (valor.length >= 1) {
            const filtradas = this.todasCuentas()
                .filter(c => c.codigo.startsWith(valor) && c.aceptaMovimiento)
                .slice(0, 8);
            const sg = [...this.sugerencias()];
            sg[i] = filtradas;
            this.sugerencias.set(sg);
        } else {
            const sg = [...this.sugerencias()];
            sg[i] = [];
            this.sugerencias.set(sg);
        }
    }

    buscarCuenta(i: number) {
        // Si el usuario escribió un código exacto y no hay nada seleccionado, buscar en backend
        const ls = this.lineas();
        if (ls[i].cuentaId || !ls[i].codigoCuenta) {
            // Limpiar sugerencias con delay para permitir click
            setTimeout(() => {
                const sg = [...this.sugerencias()];
                sg[i] = [];
                this.sugerencias.set(sg);
            }, 200);
            return;
        }
        this.cuentaService.buscarPorCodigo(ls[i].codigoCuenta).subscribe({
            next: (c) => this.seleccionarCuenta(i, c),
            error: () => {
                setTimeout(() => {
                    const sg = [...this.sugerencias()];
                    sg[i] = [];
                    this.sugerencias.set(sg);
                }, 200);
            }
        });
    }

    seleccionarCuenta(i: number, c: CuentaContable) {
        const ls = [...this.lineas()];
        ls[i].cuentaId = c.id;
        ls[i].codigoCuenta = c.codigo;
        ls[i].nombreCuenta = c.nombre;
        this.lineas.set(ls);
        const sg = [...this.sugerencias()];
        sg[i] = [];
        this.sugerencias.set(sg);
    }

    guardar(estado: 'BORRADOR' | 'DEFINITIVO') {
        if (!this.formularioValido()) return;
        if (estado === 'DEFINITIVO' && !this.cuadra()) {
            this.errorForm.set('El asiento no cuadra. DEBE debe ser igual a HABER.');
            return;
        }

        const user = this.auth.currentUser();
        const companyId = String(user?.activeCompanyId ?? 1);
        const periodoId = this.periodoSeleccionado();

        const movimientos: MovimientoRequest[] = this.lineas()
            .filter(l => l.cuentaId && ((Number(l.debe) || 0) > 0 || (Number(l.haber) || 0) > 0))
            .map(l => ({
                cuentaId: l.cuentaId,
                codigoCuenta: l.codigoCuenta,
                debe: Number(l.debe) || 0,
                haber: Number(l.haber) || 0,
                glosa: l.glosa || this.form.glosa,
            }));

        const request: AsientoRequest = {
            fecha: this.form.fecha,
            glosa: this.form.glosa,
            tipo: this.form.tipo,
            origen: 'MANUAL',
            periodoId,
            companyId,
            tenantId: companyId,
            movimientos,
        };

        this.guardando.set(true);
        this.errorForm.set(null);
        this.asientoService.crearAsiento(request).subscribe({
            next: () => {
                this.guardando.set(false);
                this.cerrarForm();
                this.cargarAsientos();
            },
            error: (err: { error?: { detail?: string } }) => {
                this.guardando.set(false);
                this.errorForm.set(err?.error?.detail ?? 'Error al guardar el asiento');
            }
        });
    }

    cerrarAsiento(asiento: Asiento) {
        this.asientoService.cerrarAsiento(asiento.id).subscribe({
            next: () => this.cargarAsientos(),
            error: () => this.error.set('No se pudo cerrar el asiento')
        });
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    estadoBadge(estado: string): string {
        const map: Record<string, string> = {
            'DEFINITIVO': 'badge badge-success',
            'BORRADOR': 'badge badge-warning',
            'CONAFECTAR': 'badge badge-accent',
            'CERRADO': 'badge badge-neutral'
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    private lineaVacia(): LineaForm {
        return { cuentaId: '', codigoCuenta: '', nombreCuenta: '', debe: 0, haber: 0, glosa: '' };
    }
}
