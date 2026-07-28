import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
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
    readonly catalog = inject(CatalogService);

    readonly reglas = signal<ReglaAsiento[]>([]);
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly mostrarForm = signal(false);
    readonly editandoId = signal<string | null>(null);
    readonly error = signal('');
    readonly errorForm = signal('');

    // ── Tabla — TODOS los filtros son server-side, la vista nunca filtra la página cargada ──
    readonly searchQuery = signal('');
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    readonly filterTransactionType = signal('');
    /** '' = todos, 'true' = activas, 'false' = inactivas (ver ACTIVO_OPTIONS). */
    readonly filterActive = signal('');
    readonly filterCampoOrigen = signal('');
    readonly filterCreatedAtDesde = signal<string | null>(null);
    readonly filterCreatedAtHasta = signal<string | null>(null);

    /**
     * Filtros select del toolbar. `active` usa `staticFilter` (no `ESTADO_ACTIVO_INACTIVO`,
     * cuyos códigos ACTIVO/INACTIVO son para columnas String): la columna `active` es boolean
     * y el backend espera `true`/`false` literal — ver ReglaAsientoController.list.
     */
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'TIPO_TRANSACCION_REGLA_ASIENTO', 'transactionType', 'Tipo de transacción'),
        staticFilter('active', 'Estado', ACTIVO_OPTIONS),
        catalogFilter(this.catalog, 'CAMPO_ORIGEN_REGLA_ASIENTO', 'campoOrigen', 'Campo origen'),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de creación' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros vigentes en la búsqueda.
     * Ver /finance/api/v1/contabilidad/reglas-asiento/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/reglas-asiento/export`,
        filename: 'reglas-asiento',
        params: () => ({
            search: this.searchQuery(),
            transactionType: this.filterTransactionType(),
            active: this.filterActive(),
            campoOrigen: this.filterCampoOrigen(),
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined,
        }),
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
            onClick: r => this.abrirEditar(r)
        },
        {
            label: 'Desactivar', icon: 'x', class: 'btn-view',
            show: r => r.activo,
            onClick: r => this.desactivar(r.id)
        },
        {
            label: 'Activar', icon: 'check', class: 'btn-view',
            show: r => !r.activo,
            onClick: r => this.activar(r.id)
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
        this.service.buscarPaginado({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            transactionType: this.filterTransactionType() || undefined,
            active: this.filterActive() ? this.filterActive() === 'true' : undefined,
            campoOrigen: this.filterCampoOrigen() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() || undefined,
            createdAtHasta: this.filterCreatedAtHasta() || undefined,
        }).subscribe({
            next: res => {
                this.reglas.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al cargar reglas');
                this.cargando.set(false);
            },
        });
    }

    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'transactionType': this.filterTransactionType.set(valor); break;
            case 'active':          this.filterActive.set(valor); break;
            case 'campoOrigen':     this.filterCampoOrigen.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'createdAt') {
            this.filterCreatedAtDesde.set(event.from);
            this.filterCreatedAtHasta.set(event.to);
            this.currentPage.set(0);
            this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTransactionType.set('');
        this.filterActive.set('');
        this.filterCampoOrigen.set('');
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
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
            next: () => {
                this.mostrarForm.set(false);
                this.guardando.set(false);
                this.cargar();
            },
            error: (err: unknown) => {
                this.errorForm.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al guardar');
                this.guardando.set(false);
            },
        });
    }

    desactivar(id: string) {
        this.service.desactivar(id).subscribe({
            next: () => this.cargar(),
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al desactivar');
            },
        });
    }

    activar(id: string) {
        this.service.activar(id).subscribe({
            next: () => this.cargar(),
            error: (err: unknown) => {
                this.error.set(err instanceof HttpErrorResponse ? (err.error?.message ?? err.message) : 'Error al activar');
            },
        });
    }
}
