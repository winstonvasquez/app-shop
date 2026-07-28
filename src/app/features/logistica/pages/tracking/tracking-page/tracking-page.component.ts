import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ShipmentService, TrackingInfoResponse, ShipmentResponse } from '../../../services/shipment.service';
import { TransportistaService } from '../../../services/transportista.service';
import { Transportista } from '../../../models/transportista.model';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { ButtonComponent } from '@shared/components';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-tracking-page',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, DataTableComponent, PageHeaderComponent, ButtonComponent],
    templateUrl: './tracking-page.component.html',
    styleUrls: ['./tracking-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackingPageComponent implements OnInit {
    private readonly shipmentService = inject(ShipmentService);
    private readonly transportistaService = inject(TransportistaService);
    private readonly authService = inject(AuthService);
    private readonly catalog = inject(CatalogService);
    private readonly fb = inject(FormBuilder);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Tracking' }
    ];

    // Data auxiliar para el filtro de transportista
    transportistas = signal<Transportista[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery           = signal('');
    filterStatus          = signal('');
    filterCarrierId       = signal('');
    filterFulfillmentType = signal('');
    filterDispatchedAtDesde = signal<string | undefined>(undefined);
    filterDispatchedAtHasta = signal<string | undefined>(undefined);
    filterRegistradoDesde   = signal<string | undefined>(undefined);
    filterRegistradoHasta   = signal<string | undefined>(undefined);

    // Filtros select del toolbar (catálogo + lista de transportistas ya cargada)
    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_ENVIO', 'status', 'Estado'),
        signalFilter('carrierId', 'Transportista', this.transportistas,
            t => ({ value: t.id, label: t.name })),
        catalogFilter(this.catalog, 'TIPO_FULFILLMENT', 'fulfillmentType', 'Tipo de fulfillment'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'dispatchedAt', label: 'Fecha de despacho' },
        { field: 'fechaCreacion', label: 'Fecha de creación' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros que la tabla. Ver /logistics/api/shipments/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/shipments/export`,
        filename: 'envios-tracking',
        params: () => ({
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            carrierId: this.filterCarrierId() || undefined,
            fulfillmentType: this.filterFulfillmentType() || undefined,
            dispatchedAtDesde: this.filterDispatchedAtDesde(),
            dispatchedAtHasta: this.filterDispatchedAtHasta(),
            registradoDesde: this.filterRegistradoDesde(),
            registradoHasta: this.filterRegistradoHasta(),
        })
    };

    columns: TableColumn<ShipmentResponse>[] = [
        { key: 'trackingNumber', label: 'Tracking' },
        { key: 'originAddress', label: 'Origen', render: (row) => row.originAddress || '-' },
        { key: 'destinationAddress', label: 'Destino', render: (row) => row.destinationAddress || '-' },
        { key: 'status', label: 'Estado', html: true,
          render: (row) => `<span class="${this.statusBadge(row.status)}">${row.status}</span>` },
        { key: 'createdAt', label: 'Creado',
          render: (row) => row.createdAt
            ? new Date(row.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '-' },
    ];

    envioActions: TableAction<ShipmentResponse>[] = [
        {
            label: 'Ver tracking', icon: '📍', class: 'btn-view',
            onClick: (row) => this.rastrearDesdeTabla(row.trackingNumber)
        }
    ];

    searchForm = this.fb.group({
        trackingInput: ['']
    });

    readonly trackingInfo  = signal<TrackingInfoResponse | null>(null);
    readonly envios        = signal<ShipmentResponse[]>([]);
    readonly buscando      = signal(false);
    readonly loadingEnvios = signal(false);
    readonly errorMsg      = signal('');

    // Paginación SERVER-SIDE: el endpoint devuelve un Page (ronda 2026-07-27),
    // así que `envios()` ya es solo la página actual y el total viene del backend.
    readonly currentPage   = signal(0);
    readonly pageSize      = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages    = signal(1);
    readonly enviosPagina  = computed(() => this.envios());

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadTransportistas();
        this.cargarEnvios();
    }

    loadTransportistas() {
        this.transportistaService.getTransportistas(this.companyId, 0, 100).subscribe({
            next: (res) => this.transportistas.set(res.content),
            error: () => this.transportistas.set([])
        });
    }

    cargarEnvios() {
        this.loadingEnvios.set(true);
        this.shipmentService.getShipments({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            carrierId: this.filterCarrierId() || undefined,
            fulfillmentType: this.filterFulfillmentType() || undefined,
            dispatchedAtDesde: this.filterDispatchedAtDesde(),
            dispatchedAtHasta: this.filterDispatchedAtHasta(),
            registradoDesde: this.filterRegistradoDesde(),
            registradoHasta: this.filterRegistradoHasta()
        }).subscribe({
            next: (page) => {
                this.envios.set(page.content);
                this.totalElements.set(pageTotalElements(page));
                this.totalPages.set(pageTotalPages(page) || 1);
                this.loadingEnvios.set(false);
            },
            error: () => {
                this.envios.set([]);
                this.totalElements.set(0);
                this.totalPages.set(1);
                this.loadingEnvios.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearch(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargarEnvios();
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':          this.filterStatus.set(valor); break;
            case 'carrierId':       this.filterCarrierId.set(valor); break;
            case 'fulfillmentType': this.filterFulfillmentType.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarEnvios();
    }

    onDateRangeChange(event: DateRangeChangeEvent) {
        switch (event.field) {
            case 'dispatchedAt':
                this.filterDispatchedAtDesde.set(event.from ?? undefined);
                this.filterDispatchedAtHasta.set(event.to ?? undefined);
                break;
            case 'fechaCreacion':
                this.filterRegistradoDesde.set(event.from ?? undefined);
                this.filterRegistradoHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarEnvios();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear() {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterCarrierId.set('');
        this.filterFulfillmentType.set('');
        this.filterDispatchedAtDesde.set(undefined);
        this.filterDispatchedAtHasta.set(undefined);
        this.filterRegistradoDesde.set(undefined);
        this.filterRegistradoHasta.set(undefined);
        this.currentPage.set(0);
        this.cargarEnvios();
    }

    buscarTracking() {
        const numero = (this.searchForm.value.trackingInput ?? '').trim();
        if (!numero) return;
        this.buscando.set(true);
        this.errorMsg.set('');
        this.trackingInfo.set(null);
        this.shipmentService.trackShipment(numero).subscribe({
            next: (info) => {
                this.trackingInfo.set(info);
                this.buscando.set(false);
            },
            error: () => {
                this.errorMsg.set('No se encontró información para el número de guía ingresado.');
                this.buscando.set(false);
            }
        });
    }

    rastrearDesdeTabla(trackingNumber: string) {
        this.searchForm.patchValue({ trackingInput: trackingNumber });
        this.buscarTracking();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargarEnvios();
    }

    statusBadge(status: string): string {
        const map: Record<string, string> = {
            CREATED: 'badge badge-accent',
            PICKED_UP: 'badge badge-accent',
            IN_TRANSIT: 'badge badge-warning',
            OUT_FOR_DELIVERY: 'badge badge-warning',
            DELIVERED: 'badge badge-success',
            FAILED: 'badge badge-error',
            RETURNED: 'badge badge-neutral'
        };
        return map[status] ?? 'badge badge-neutral';
    }
}
