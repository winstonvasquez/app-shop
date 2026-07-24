import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import {
    ReglaAsientoService, ReglaAsiento, ReglaAsientoRequest, DetalleRegla, TransactionType
} from '../../services/regla-asiento.service';

@Component({
    selector: 'app-reglas-asiento',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, DrawerComponent, DataTableComponent, CatalogSelectComponent],
    templateUrl: './reglas-asiento.component.html',
})
export class ReglasAsientoComponent implements OnInit {
    private service = inject(ReglaAsientoService);

    readonly reglas = signal<ReglaAsiento[]>([]);
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly mostrarForm = signal(false);
    readonly editandoId = signal<string | null>(null);
    readonly error = signal('');
    readonly errorForm = signal('');

    // ── Tabla ─────────────────────────────────────────────────────────────────
    readonly searchQuery = signal('');
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);

    readonly reglasFiltradas = computed(() => {
        const q = this.searchQuery().trim().toLowerCase();
        const lista = this.reglas();
        if (!q) return lista;
        return lista.filter(r =>
            r.nombre?.toLowerCase().includes(q) ||
            r.descripcion?.toLowerCase().includes(q) ||
            r.transactionType?.toLowerCase().includes(q)
        );
    });

    readonly reglasPaginadas = computed(() => {
        const inicio = this.currentPage() * this.pageSize();
        return this.reglasFiltradas().slice(inicio, inicio + this.pageSize());
    });
    readonly totalPagesLocal = computed(() => Math.ceil(this.reglasFiltradas().length / this.pageSize()) || 1);

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios.
     * Ver /finance/api/v1/contabilidad/reglas-asiento/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/reglas-asiento/export`,
        filename: 'reglas-asiento',
    };

    readonly columns: TableColumn<ReglaAsiento>[] = [
        {
            key: 'transactionType', label: 'Tipo Transacción', html: true,
            render: r => `<span class="badge badge-neutral">${r.transactionType}</span>`
        },
        {
            key: 'nombre', label: 'Nombre', html: true,
            render: r => `<div class="font-medium text-on">${r.nombre}</div>${r.descripcion ? `<div class="text-muted text-sm">${r.descripcion}</div>` : ''}`
        },
        { key: 'detalles', label: 'Líneas', render: r => `${r.detalles?.length ?? 0} línea(s)` },
        {
            key: 'activo', label: 'Estado', html: true,
            render: r => r.activo
                ? '<span class="badge badge-success">Activa</span>'
                : '<span class="badge badge-neutral">Inactiva</span>'
        },
        {
            key: 'createdAt', label: 'Creado',
            render: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-PE') : '—'
        },
    ];

    readonly actions: TableAction<ReglaAsiento>[] = [
        {
            label: 'Editar', icon: 'edit', class: 'btn-view',
            show: r => r.activo,
            onClick: r => this.abrirEditar(r)
        },
        {
            label: 'Desactivar', icon: 'x', class: 'btn-view',
            show: r => r.activo,
            onClick: r => this.desactivar(r.id)
        },
    ];

    // Form signals
    readonly tipoTransaccion = signal<TransactionType>('VENTA');
    readonly nombre = signal('');
    readonly descripcion = signal('');
    readonly detalles = signal<DetalleRegla[]>([
        { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'DEBE', porcentaje: 100, orden: 1 },
        { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'HABER', porcentaje: 100, orden: 2 },
    ]);

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.listar().subscribe({
            next: data => { this.reglas.set(data); this.cargando.set(false); },
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al cargar reglas');
                this.cargando.set(false);
            },
        });
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    abrirNueva() {
        this.editandoId.set(null);
        this.tipoTransaccion.set('VENTA');
        this.nombre.set('');
        this.descripcion.set('');
        this.detalles.set([
            { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'DEBE', porcentaje: 100, orden: 1 },
            { codigoCuenta: '', campoOrigen: 'BASE', movimientoTipo: 'HABER', porcentaje: 100, orden: 2 },
        ]);
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    abrirEditar(r: ReglaAsiento) {
        this.editandoId.set(r.id);
        this.tipoTransaccion.set(r.transactionType as TransactionType);
        this.nombre.set(r.nombre);
        this.descripcion.set(r.descripcion);
        this.detalles.set(r.detalles.map(d => ({ ...d })));
        this.errorForm.set('');
        this.mostrarForm.set(true);
    }

    cerrarForm() { this.mostrarForm.set(false); }

    agregarDetalle() {
        const n = this.detalles().length + 1;
        this.detalles.update(ds => [
            ...ds,
            { codigoCuenta: '', campoOrigen: 'BASE' as const, movimientoTipo: 'DEBE' as const, porcentaje: 100, orden: n },
        ]);
    }

    eliminarDetalle(i: number) {
        if (this.detalles().length <= 2) return;
        this.detalles.update(ds => ds.filter((_, idx) => idx !== i));
    }

    actualizarDetalle(i: number, campo: keyof DetalleRegla, valor: unknown) {
        this.detalles.update(ds => ds.map((d, idx) =>
            idx === i ? { ...d, [campo]: valor } : d
        ));
    }

    guardar() {
        if (!this.nombre() || this.detalles().some(d => !d.codigoCuenta)) return;
        const req: ReglaAsientoRequest = {
            transactionType: this.tipoTransaccion(),
            nombre: this.nombre(),
            descripcion: this.descripcion(),
            detalles: this.detalles(),
        };
        this.guardando.set(true);
        this.errorForm.set('');
        const id = this.editandoId();
        const obs = id ? this.service.actualizar(id, req) : this.service.crear(req);
        obs.subscribe({
            next: regla => {
                if (id) {
                    this.reglas.update(rs => rs.map(r => r.id === id ? regla : r));
                } else {
                    this.reglas.update(rs => [...rs, regla]);
                }
                this.mostrarForm.set(false);
                this.guardando.set(false);
            },
            error: (err: unknown) => {
                this.errorForm.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al guardar');
                this.guardando.set(false);
            },
        });
    }

    desactivar(id: string) {
        this.service.desactivar(id).subscribe({
            next: () => this.reglas.update(rs => rs.map(r => r.id === id ? { ...r, activo: false } : r)),
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al desactivar');
            },
        });
    }
}
