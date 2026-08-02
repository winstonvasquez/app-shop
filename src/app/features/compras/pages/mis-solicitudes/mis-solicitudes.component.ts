import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { SolicitudCompraService } from '../../services/solicitud-compra.service';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { htmlAttr } from '@core/utils/rich-text.util';
import { SolicitudCompra } from '../../models/solicitud-compra.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-mis-solicitudes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterModule,
        PageHeaderComponent,
        AlertComponent,
        DataTableComponent,
    ],
    templateUrl: './mis-solicitudes.component.html',
})
export class MisSolicitudesComponent implements OnInit {
    private readonly solicitudService = inject(SolicitudCompraService);
    private readonly authService = inject(AuthService);
    private readonly cdr = inject(ChangeDetectorRef);
    protected readonly catalog = inject(CatalogService);

    solicitudes = signal<SolicitudCompra[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    actionError = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterEstado = signal('');
    filterPrioridad = signal('');
    filterFechaRequeridaDesde = signal<string | null>(null);
    filterFechaRequeridaHasta = signal<string | null>(null);
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    hasSolicitudes = computed(() => this.solicitudes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasSolicitudes());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Mis Solicitudes' },
    ];

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_SOLICITUD_COMPRA', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'PRIORIDAD_SOLICITUD', 'prioridad', 'Prioridad'),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaRequerida', label: 'Fecha requerida' },
        { field: 'createdAt', label: 'Fecha de solicitud' },
    ];

    columns: TableColumn<SolicitudCompra>[] = [
        { key: 'codigo', label: 'Código', width: '130px' },
        { key: 'justificacion', label: 'Justificación', html: true, render: (r) => r.justificacion },
        { key: 'prioridad', label: 'Prioridad', render: (r) => r.prioridad ?? '—' },
        { key: 'fechaRequerida', label: 'Fecha Req.', render: (r) => r.fechaRequerida || '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="${this.getBadgeClass(r.estado)}">${this.getEstadoLabel(r.estado)}</span>`
        },
        {
            key: 'motivoRechazo', label: 'Motivo Rechazo', html: true,
            render: (r) => r.motivoRechazo
                ? `<span class="badge badge-error" title="${htmlAttr(r.motivoRechazo)}">Ver motivo</span>`
                : '—'
        },
    ];

    actions: TableAction<SolicitudCompra>[] = [
        {
            label: 'Enviar', icon: 'send', class: 'btn-edit',
            show: (row) => row.estado === 'BORRADOR',
            onClick: (row) => this.enviarSolicitud(row.id!)
        },
        {
            label: 'Cancelar', icon: 'x', class: 'btn-delete',
            show: (row) => row.estado === 'BORRADOR' || row.estado === 'PENDIENTE_APROBACION',
            onClick: (row) => this.cancelarSolicitud(row.id!)
        },
    ];

    ngOnInit(): void {
        this.loadMisSolicitudes();
    }

    loadMisSolicitudes(): void {
        const user = this.authService.currentUser();
        if (!user) return;

        this.loading.set(true);
        this.error.set(null);
        this.solicitudService
            .getMisSolicitudes(user.userId, {
                page: this.currentPage(),
                size: this.pageSize(),
                q: this.searchQuery() || undefined,
                estado: this.filterEstado() || undefined,
                prioridad: this.filterPrioridad() || undefined,
                fechaRequeridaDesde: this.filterFechaRequeridaDesde() || undefined,
                fechaRequeridaHasta: this.filterFechaRequeridaHasta() || undefined,
                createdAtDesde: this.filterCreatedAtDesde() || undefined,
                createdAtHasta: this.filterCreatedAtHasta() || undefined,
            })
            .subscribe({
                next: (page) => {
                    this.solicitudes.set(page.content);
                    this.totalElements.set(pageTotalElements(page));
                    this.totalPages.set(pageTotalPages(page));
                    this.loading.set(false);
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error.set('Error al cargar tus solicitudes');
                    this.loading.set(false);
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadMisSolicitudes();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':    this.filterEstado.set(valor); break;
            case 'prioridad': this.filterPrioridad.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadMisSolicitudes();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaRequerida':
                this.filterFechaRequeridaDesde.set(event.from);
                this.filterFechaRequeridaHasta.set(event.to);
                break;
            case 'createdAt':
                this.filterCreatedAtDesde.set(event.from);
                this.filterCreatedAtHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadMisSolicitudes();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterPrioridad.set('');
        this.filterFechaRequeridaDesde.set(null);
        this.filterFechaRequeridaHasta.set(null);
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadMisSolicitudes();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadMisSolicitudes();
    }

    enviarSolicitud(id: string): void {
        this.solicitudService.enviarSolicitud(id).subscribe({
            next: () => this.loadMisSolicitudes(),
            error: (err) => {
                this.actionError.set('Error al enviar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    cancelarSolicitud(id: string): void {
        if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;
        this.solicitudService.cancelarSolicitud(id).subscribe({
            next: () => this.loadMisSolicitudes(),
            error: (err) => {
                this.actionError.set('Error al cancelar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getBadgeClass(estado: string | undefined): string {
        switch (estado) {
            case 'BORRADOR':
                return 'badge badge-neutral';
            case 'PENDIENTE_APROBACION':
                return 'badge badge-warning';
            case 'APROBADA':
                return 'badge badge-success';
            case 'RECHAZADA':
                return 'badge badge-error';
            case 'CONVERTIDA_OC':
                return 'badge badge-accent';
            case 'CANCELADA':
                return 'badge badge-neutral';
            default:
                return 'badge badge-neutral';
        }
    }

    getEstadoLabel(estado: string | undefined): string {
        return estado ? this.catalog.label('ESTADO_SOLICITUD_COMPRA', estado) : '—';
    }
}
