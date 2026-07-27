import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { RecepcionService, RecepcionPage } from '../../services/recepcion.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { AlmacenService } from '../../../logistica/services/almacen.service';
import { Recepcion, RecepcionItem } from '../../models/orden-compra.model';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PAGINATION } from '@shared/constants/app.constants';
import { ButtonComponent } from '@shared/components';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-recepcion',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    DataTableComponent,
    DrawerComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    DatePipe,
    ButtonComponent
  ],
    templateUrl: './recepcion.component.html'
})
export class RecepcionComponent implements OnInit {
    private readonly recepcionService = inject(RecepcionService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly almacenService = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    readonly catalog = inject(CatalogService);

    recepciones = signal<Recepcion[]>([]);
    selectedRecepcion = signal<Recepcion | null>(null);

    cargando = signal(false);
    loadingDetail = signal(false);
    error = signal<string | null>(null);
    detailError = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    estadoFiltro = signal('');
    filterAlmacenDestino = signal('');
    filterProveedorId = signal('');
    filterTransportista = signal('');
    filterResponsable = signal('');
    filterFechaRecepcionDesde = signal<string | null>(null);
    filterFechaRecepcionHasta = signal<string | null>(null);
    searchQuery = signal('');
    showDetail = signal(false);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    hasRecepciones = computed(() => this.recepciones().length > 0);
    isEmpty = computed(() => !this.cargando() && !this.hasRecepciones());

    /** Almacenes para el select de filtro (lista acotada, no requiere server-search). */
    almacenesFiltro = signal<{ id: string; nombre: string }[]>([]);
    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros select del toolbar. Las opciones salen de erp_parameters o de listas propias (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_RECEPCION', 'estado', 'Todos los estados'),
        signalFilter('almacenDestino', 'Todos los almacenes', this.almacenesFiltro,
            a => ({ value: a.id, label: a.nombre })),
        signalFilter('proveedorId', 'Todos los proveedores', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial }))
    ];

    /** Rango de fecha de recepción para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaRecepcion', label: 'Fecha de recepción' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Recepción Mercadería' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /purchases/api/recepciones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/recepciones/export`,
        filename: 'recepciones',
        params: () => ({
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            almacenDestino: this.filterAlmacenDestino() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            transportista: this.filterTransportista() || undefined,
            responsable: this.filterResponsable() || undefined,
            fechaRecepcionDesde: this.filterFechaRecepcionDesde() ?? undefined,
            fechaRecepcionHasta: this.filterFechaRecepcionHasta() ?? undefined
        }),
    };

    columns: TableColumn<Recepcion>[] = [
        {
            key: 'id', label: 'Recepción', width: '130px',
            render: (row) => `REC-${(row.id ?? '').toString().slice(0, 8).toUpperCase()}`
        },
        {
            key: 'ordenCompraCodigo', label: 'OC Referencia',
            render: (row) => row.ordenCompraCodigo ?? '—'
        },
        {
            key: 'fechaRecepcion', label: 'Fecha',
            render: (row) => row.fechaRecepcion
                ? new Date(row.fechaRecepcion).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'numeroGuia', label: 'Guía Remisión',
            render: (row) => row.numeroGuia ?? '—'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (row) => `<span class="badge badge-${this.badgeEstado(row.estado)}">${this.catalog.label('ESTADO_RECEPCION', row.estado)}</span>`
        }
    ];

    actions: TableAction<Recepcion>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row.id!)
        }
    ];

    ngOnInit(): void {
        this.loadRecepciones();
        this.loadAlmacenesFiltro();
        this.loadProveedoresFiltro();
    }

    /** Almacenes para el select de filtro del toolbar. */
    private loadAlmacenesFiltro(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (!companyId) { this.almacenesFiltro.set([]); return; }
        this.almacenService.getAlmacenes(String(companyId), { size: PAGINATION.maxPageSize }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadRecepciones(): void {
        this.cargando.set(true);
        this.error.set(null);
        this.recepcionService.getRecepciones({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            almacenDestino: this.filterAlmacenDestino() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            transportista: this.filterTransportista() || undefined,
            responsable: this.filterResponsable() || undefined,
            fechaRecepcionDesde: this.filterFechaRecepcionDesde() || undefined,
            fechaRecepcionHasta: this.filterFechaRecepcionHasta() || undefined
        }).subscribe({
            next: (res: RecepcionPage) => {
                this.recepciones.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudieron cargar las recepciones.');
                this.cargando.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':          this.estadoFiltro.set(valor); break;
            case 'almacenDestino':  this.filterAlmacenDestino.set(valor); break;
            case 'proveedorId':     this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    /** Filtros de texto libre (exact-match en backend): transportista y responsable. */
    onFilterTransportista(valor: string): void {
        this.filterTransportista.set(valor);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onFilterResponsable(valor: string): void {
        this.filterResponsable.set(valor);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaRecepcion') {
            this.filterFechaRecepcionDesde.set(event.from);
            this.filterFechaRecepcionHasta.set(event.to);
            this.currentPage.set(0);
            this.loadRecepciones();
        }
    }

    /** "Limpiar filtros": resetea todo (incluidos los inputs de texto libre) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.estadoFiltro.set('');
        this.filterAlmacenDestino.set('');
        this.filterProveedorId.set('');
        this.filterTransportista.set('');
        this.filterResponsable.set('');
        this.filterFechaRecepcionDesde.set(null);
        this.filterFechaRecepcionHasta.set(null);
        this.currentPage.set(0);
        this.loadRecepciones();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadRecepciones();
    }

    openDetail(id: string): void {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selectedRecepcion.set(null);
        this.detailError.set(null);
        this.recepcionService.getRecepcionById(id).subscribe({
            next: (rec) => {
                this.selectedRecepcion.set(rec);
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.detailError.set(err.message ?? 'Error al cargar el detalle.');
                this.loadingDetail.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedRecepcion.set(null);
        this.detailError.set(null);
    }

    confirmarRecepcion(): void {
        const rec = this.selectedRecepcion();
        if (!rec) return;
        this.loadingDetail.set(true);
        this.recepcionService.confirmarRecepcion(rec.id!).subscribe({
            next: (updated) => {
                this.selectedRecepcion.set(updated);
                this.recepciones.update(list =>
                    list.map(r => r.id === updated.id ? { ...r, estado: updated.estado } : r)
                );
                this.loadingDetail.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loadingDetail.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'warning',
            CONFORME: 'success',
            CON_DIFERENCIAS: 'error',
            DIFERENCIA: 'error',
            COMPLETADA: 'success'
        };
        return map[estado] ?? 'neutral';
    }
}

