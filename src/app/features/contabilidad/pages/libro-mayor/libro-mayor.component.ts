import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';
import { CuentaService, CuentaContable } from '../../services/cuenta.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

interface MayorMovimiento {
    fecha: string;
    codigoAsiento: string;
    glosa: string;
    debe: number;
    haber: number;
    saldo: number;
}

@Component({
    selector: 'app-libro-mayor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ButtonComponent, DataTableComponent],
    templateUrl: './libro-mayor.component.html'
})
export class LibroMayorComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private cuentaService = inject(CuentaService);
    private periodoService = inject(PeriodoService);

    cuentas = signal<CuentaContable[]>([]);
    periodos = signal<PeriodoContable[]>([]);
    cuentaSeleccionada = signal<string>('');
    periodoSeleccionado = signal<string>('');
    cuentaInfo = signal<CuentaContable | null>(null);
    movimientos = signal<MayorMovimiento[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    readonly searchQuery = signal('');
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);

    readonly movimientosFiltrados = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        const lista = this.movimientos();
        if (!q) return lista;
        return lista.filter(m =>
            m.codigoAsiento?.toLowerCase().includes(q) ||
            m.glosa?.toLowerCase().includes(q)
        );
    });

    readonly movimientosPaginados = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.movimientosFiltrados().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.movimientosFiltrados().length / this.pageSize()) || 1);

    readonly totalDebe = computed(() => this.movimientos().reduce((s, m) => s + m.debe, 0));
    readonly totalHaber = computed(() => this.movimientos().reduce((s, m) => s + m.haber, 0));

    readonly columns: TableColumn<MayorMovimiento>[] = [
        {
            key: 'fecha', label: 'Fecha', html: true,
            render: m => `<span class="font-mono">${m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '-'}</span>`
        },
        {
            key: 'codigoAsiento', label: 'N° Asiento', html: true,
            render: m => `<span class="font-mono font-bold">${m.codigoAsiento}</span>`
        },
        { key: 'glosa', label: 'Descripción' },
        {
            key: 'debe', label: 'Debe', align: 'right', html: true,
            render: m => `<span class="font-mono">${m.debe > 0 ? 'S/ ' + m.debe.toFixed(2) : ''}</span>`
        },
        {
            key: 'haber', label: 'Haber', align: 'right', html: true,
            render: m => `<span class="font-mono">${m.haber > 0 ? 'S/ ' + m.haber.toFixed(2) : ''}</span>`
        },
        {
            key: 'saldo', label: 'Saldo acumulado', align: 'right', html: true,
            render: m => `<span class="font-mono" style="${m.saldo < 0 ? 'color:var(--color-error)' : ''}">S/ ${m.saldo.toFixed(2)}</span>`
        }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/libro-mayor/export`,
        filename: 'libro-mayor',
        params: () => ({
            periodo: this.periodoSeleccionado() || undefined,
            cuenta: this.cuentaSeleccionada() || undefined,
        }),
    };

    ngOnInit() {
        this.cuentaService.listarTodas().subscribe({
            next: (lista) => this.cuentas.set(lista.filter(c => c.aceptaMovimiento)),
            error: () => {}
        });
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) this.periodoSeleccionado.set(abierto.id);
            },
            error: () => {}
        });
    }

    cambiarCuenta(id: string) {
        this.cuentaSeleccionada.set(id);
        this.cuentaInfo.set(this.cuentas().find(c => c.id === id) ?? null);
        this.movimientos.set([]);
        this.searchQuery.set('');
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        this.movimientos.set([]);
        this.searchQuery.set('');
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    cargarMayor() {
        const periodoId = this.periodoSeleccionado();
        const cuentaId = this.cuentaSeleccionada();
        if (!periodoId || !cuentaId) return;
        this.currentPage.set(0);
        this.searchQuery.set('');
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerLibroMayor(periodoId, cuentaId).subscribe({
            next: (data: unknown) => {
                const lista = Array.isArray(data) ? data as MayorMovimiento[] : [];
                this.movimientos.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el libro mayor');
                this.cargando.set(false);
            }
        });
    }
}
