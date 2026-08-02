import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { EnvioService } from '../../services/envio.service';
import { TransportistaService } from '../../services/transportista.service';
import { DeliveryService } from '../../services/delivery.service';
import { Envio, EnvioStatus, TrackingEvent } from '../../models/envio.model';
import { Transportista } from '../../models/transportista.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent, RichTextEditorComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-envios-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    RichTextEditorComponent,
    DataTableComponent,
    DrawerComponent,
    DateInputComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    DatePipe
  ],
    templateUrl: './envios-page.component.html'
})
export class EnviosPageComponent implements OnInit {
    private readonly envioService        = inject(EnvioService);
    private readonly transportistaService = inject(TransportistaService);
    private readonly deliveryService     = inject(DeliveryService);
    private readonly authService         = inject(AuthService);
    private readonly fb                  = inject(FormBuilder);
    private readonly catalog             = inject(CatalogService);

    // Data
    envios         = signal<Envio[]>([]);
    transportistas = signal<Transportista[]>([]);
    selected       = signal<Envio | null>(null);

    // UI state
    loading        = signal(false);
    loadingDetail  = signal(false);
    error          = signal<string | null>(null);
    showForm       = signal(false);
    showDetail     = signal(false);
    submitting     = signal(false);
    submitError    = signal<string | null>(null);

    // Avanzar estado (transportistas sin integración de tracking API)
    showAdvance       = signal(false);
    advanceTarget     = signal<Envio | null>(null);
    advancing         = signal(false);
    advanceError      = signal<string | null>(null);

    /** Progresión lineal habilitada desde la UI; OUT_FOR_DELIVERY se cierra con 'Confirmar entrega'. */
    private readonly NEXT_STATUS: Partial<Record<EnvioStatus, EnvioStatus>> = {
        PENDING_DISPATCH: 'DISPATCHED',
        DISPATCHED:       'IN_TRANSIT',
        IN_TRANSIT:       'OUT_FOR_DELIVERY'
    };

    // Confirmación de entrega (POD) con GPS
    showConfirm       = signal(false);
    confirmTarget     = signal<Envio | null>(null);
    submittingConfirm = signal(false);
    confirmError      = signal<string | null>(null);
    confirmInfo       = signal<string | null>(null);
    capturingGps      = signal(false);
    gpsError          = signal<string | null>(null);
    gpsLat            = signal<number | null>(null);
    gpsLng            = signal<number | null>(null);
    gpsAccuracy       = signal<number | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterStatus          = signal('');
    filterCarrierId       = signal('');
    filterFulfillmentType = signal('');
    searchQuery           = signal('');
    filterDispatchedAtDesde        = signal<string | undefined>(undefined);
    filterDispatchedAtHasta        = signal<string | undefined>(undefined);
    filterEstimatedDeliveryDesde   = signal<string | undefined>(undefined);
    filterEstimatedDeliveryHasta   = signal<string | undefined>(undefined);
    filterActualDeliveryDesde      = signal<string | undefined>(undefined);
    filterActualDeliveryHasta      = signal<string | undefined>(undefined);
    filterRegistradoDesde          = signal<string | undefined>(undefined);
    filterRegistradoHasta          = signal<string | undefined>(undefined);

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única)
    // y de `transportistas` (lista dinámica ya cargada en loadTransportistas()).
    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_ENVIO', 'status', 'Estado'),
        signalFilter('carrierId', 'Transportista', this.transportistas,
            t => ({ value: t.id, label: t.name })),
        catalogFilter(this.catalog, 'TIPO_FULFILLMENT', 'fulfillmentType', 'Tipo de fulfillment'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'dispatchedAt', label: 'Fecha de despacho' },
        { field: 'estimatedDeliveryDate', label: 'Entrega estimada' },
        { field: 'actualDeliveryDate', label: 'Entrega real' },
        { field: 'fechaCreacion', label: 'Registrado' },
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Envíos' }
    ];

    columns: TableColumn<Envio>[] = [
        { key: 'trackingNumber', label: 'N° Tracking' },
        { key: 'recipientName',  label: 'Destinatario' },
        { key: 'shippingAddress', label: 'Dirección destino',
          render: (r) => r.shippingAddress.length > 45 ? r.shippingAddress.slice(0, 45) + '…' : r.shippingAddress },
        { key: 'carrierNombre',  label: 'Transportista', render: (r) => r.carrierNombre || '—' },
        { key: 'estimatedDeliveryDate', label: 'Entrega estimada',
          render: (r) => r.estimatedDeliveryDate
            ? new Date(r.estimatedDeliveryDate).toLocaleDateString('es-PE') : '—' },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeStatus(r.status)}">${this.catalog.label('ESTADO_ENVIO', r.status)}</span>` },
        { key: 'createdAt', label: 'Registrado',
          render: (r) => new Date(r.createdAt).toLocaleDateString('es-PE') }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios.
     * Ver /logistics/api/shipments/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/shipments/export`,
        filename: 'envios',
        params: () => ({
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            carrierId: this.filterCarrierId() || undefined,
            fulfillmentType: this.filterFulfillmentType() || undefined,
            dispatchedAtDesde: this.filterDispatchedAtDesde(),
            dispatchedAtHasta: this.filterDispatchedAtHasta(),
            estimatedDeliveryDesde: this.filterEstimatedDeliveryDesde(),
            estimatedDeliveryHasta: this.filterEstimatedDeliveryHasta(),
            actualDeliveryDesde: this.filterActualDeliveryDesde(),
            actualDeliveryHasta: this.filterActualDeliveryHasta(),
            registradoDesde: this.filterRegistradoDesde(),
            registradoHasta: this.filterRegistradoHasta(),
        }),
    };

    actions: TableAction<Envio>[] = [
        {
            label: 'Ver detalle', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row)
        },
        {
            label: 'Avanzar estado', icon: '🚚', class: 'btn-view',
            show: (row) => row.status in this.NEXT_STATUS,
            onClick: (row) => this.openAdvance(row)
        },
        {
            label: 'Confirmar entrega', icon: '📍', class: 'btn-primary',
            show: (row) => row.status === 'OUT_FOR_DELIVERY',
            onClick: (row) => this.openConfirm(row)
        }
    ];

    form: FormGroup;
    confirmForm: FormGroup;
    advanceForm: FormGroup;

    constructor() {
        this.form = this.fb.group({
            carrierId:             ['', Validators.required],
            shippingAddress:       ['', Validators.required],
            recipientName:         ['', Validators.required],
            recipientPhone:        [''],
            recipientEmail:        ['', Validators.email],
            shippingCost:          [null],
            estimatedDeliveryDate: [''],
            notes:                 ['']
        });
        this.confirmForm = this.fb.group({
            receivedBy:       ['', Validators.required],
            receiverIdNumber: [''],
            notes:            ['']
        });
        this.advanceForm = this.fb.group({
            location:    ['', Validators.required],
            description: ['', Validators.required]
        });
    }

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadTransportistas();
        this.loadEnvios();
    }

    loadTransportistas() {
        this.transportistaService.getTransportistas(this.companyId, 0, 100).subscribe({
            next: (res) => this.transportistas.set(res.content),
            error: () => this.transportistas.set([])
        });
    }

    loadEnvios() {
        this.loading.set(true);
        this.error.set(null);
        this.envioService.getEnvios(this.companyId, {
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            carrierId: this.filterCarrierId() || undefined,
            fulfillmentType: this.filterFulfillmentType() || undefined,
            dispatchedAtDesde: this.filterDispatchedAtDesde(),
            dispatchedAtHasta: this.filterDispatchedAtHasta(),
            estimatedDeliveryDesde: this.filterEstimatedDeliveryDesde(),
            estimatedDeliveryHasta: this.filterEstimatedDeliveryHasta(),
            actualDeliveryDesde: this.filterActualDeliveryDesde(),
            actualDeliveryHasta: this.filterActualDeliveryHasta(),
            registradoDesde: this.filterRegistradoDesde(),
            registradoHasta: this.filterRegistradoHasta()
        }).subscribe({
            next: (res) => {
                this.envios.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar envíos.');
                this.loading.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearch(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadEnvios();
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
        this.loadEnvios();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear() {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterCarrierId.set('');
        this.filterFulfillmentType.set('');
        this.filterDispatchedAtDesde.set(undefined);
        this.filterDispatchedAtHasta.set(undefined);
        this.filterEstimatedDeliveryDesde.set(undefined);
        this.filterEstimatedDeliveryHasta.set(undefined);
        this.filterActualDeliveryDesde.set(undefined);
        this.filterActualDeliveryHasta.set(undefined);
        this.filterRegistradoDesde.set(undefined);
        this.filterRegistradoHasta.set(undefined);
        this.currentPage.set(0);
        this.loadEnvios();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadEnvios();
    }

    onDateRangeChange(event: DateRangeChangeEvent) {
        switch (event.field) {
            case 'dispatchedAt':
                this.filterDispatchedAtDesde.set(event.from ?? undefined);
                this.filterDispatchedAtHasta.set(event.to ?? undefined);
                break;
            case 'estimatedDeliveryDate':
                this.filterEstimatedDeliveryDesde.set(event.from ?? undefined);
                this.filterEstimatedDeliveryHasta.set(event.to ?? undefined);
                break;
            case 'actualDeliveryDate':
                this.filterActualDeliveryDesde.set(event.from ?? undefined);
                this.filterActualDeliveryHasta.set(event.to ?? undefined);
                break;
            case 'fechaCreacion':
                this.filterRegistradoDesde.set(event.from ?? undefined);
                this.filterRegistradoHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadEnvios();
    }

    // ── Detalle ───────────────────────────────────────────
    openDetail(envio: Envio) {
        this.loadingDetail.set(true);
        this.showDetail.set(true);
        this.selected.set(envio);
        this.envioService.getById(envio.id, this.companyId).subscribe({
            next: (res) => {
                this.selected.set(res);
                this.loadingDetail.set(false);
            },
            error: () => this.loadingDetail.set(false)
        });
    }

    closeDetail() {
        this.showDetail.set(false);
        this.selected.set(null);
    }

    // ── Formulario ────────────────────────────────────────
    openCreateForm() {
        this.form.reset();
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm() {
        this.showForm.set(false);
        this.form.reset();
    }

    onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        this.submitError.set(null);

        this.envioService.create({
            ...this.form.value,
            tenantId:  this.companyId,
            companyId: this.companyId
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadEnvios();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al crear envío.');
                this.submitting.set(false);
            }
        });
    }

    // ── Avanzar estado (PENDING_DISPATCH → DISPATCHED → IN_TRANSIT → OUT_FOR_DELIVERY) ──
    openAdvance(envio: Envio): void {
        this.advanceTarget.set(envio);
        this.advanceForm.reset();
        this.advanceError.set(null);
        this.showAdvance.set(true);
    }

    closeAdvance(): void {
        this.showAdvance.set(false);
        this.advanceTarget.set(null);
    }

    /** Estado destino legible para el envío actualmente en el drawer (o '' si no aplica). */
    nextStatusLabel(): string {
        const envio = this.advanceTarget();
        if (!envio) return '';
        const next = this.NEXT_STATUS[envio.status];
        return next ? this.statusLabel(next) : '';
    }

    submitAdvance(): void {
        const envio = this.advanceTarget();
        if (!envio) return;
        const next = this.NEXT_STATUS[envio.status];
        if (!next) return;
        if (this.advanceForm.invalid) { this.advanceForm.markAllAsTouched(); return; }
        const v = this.advanceForm.getRawValue();
        this.advancing.set(true);
        this.advanceError.set(null);
        this.envioService.updateStatus(envio.id, {
            status: next,
            location: v.location,
            description: v.description
        }).subscribe({
            next: () => {
                this.advancing.set(false);
                this.closeAdvance();
                this.loadEnvios();
            },
            error: (err: Error) => {
                this.advancing.set(false);
                this.advanceError.set(err.message ?? 'Error al actualizar el estado del envío.');
            }
        });
    }

    // ── Confirmación de entrega (POD + GPS) ───────────────
    openConfirm(envio: Envio): void {
        this.confirmTarget.set(envio);
        this.confirmForm.reset();
        this.confirmError.set(null);
        this.gpsError.set(null);
        this.gpsLat.set(null);
        this.gpsLng.set(null);
        this.gpsAccuracy.set(null);
        this.showConfirm.set(true);
    }

    closeConfirm(): void {
        this.showConfirm.set(false);
        this.confirmTarget.set(null);
    }

    /** Captura la ubicación del dispositivo del repartidor (proof of delivery). */
    captureGps(): void {
        if (!navigator.geolocation) {
            this.gpsError.set('Este dispositivo no soporta geolocalización.');
            return;
        }
        this.capturingGps.set(true);
        this.gpsError.set(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.gpsLat.set(Number(pos.coords.latitude.toFixed(7)));
                this.gpsLng.set(Number(pos.coords.longitude.toFixed(7)));
                this.gpsAccuracy.set(Math.round(pos.coords.accuracy));
                this.capturingGps.set(false);
            },
            (err) => {
                this.gpsError.set('No se pudo obtener la ubicación: ' + err.message);
                this.capturingGps.set(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    submitConfirm(): void {
        const envio = this.confirmTarget();
        if (!envio || this.confirmForm.invalid) { this.confirmForm.markAllAsTouched(); return; }
        const v = this.confirmForm.getRawValue();
        this.submittingConfirm.set(true);
        this.confirmError.set(null);
        this.deliveryService.confirmDelivery(envio.id, {
            receivedBy:       v.receivedBy,
            receiverIdNumber: v.receiverIdNumber || undefined,
            notes:            v.notes || undefined,
            latitude:         this.gpsLat() ?? undefined,
            longitude:        this.gpsLng() ?? undefined
        }).subscribe({
            next: () => {
                this.submittingConfirm.set(false);
                this.closeConfirm();
                this.confirmInfo.set(`Entrega de ${envio.trackingNumber} confirmada.`);
                this.loadEnvios();
            },
            error: (err: Error) => {
                this.submittingConfirm.set(false);
                this.confirmError.set(err.message ?? 'Error al confirmar la entrega.');
            }
        });
    }

    badgeStatus(status: EnvioStatus): string {
        const map: Record<EnvioStatus, string> = {
            PENDING_DISPATCH: 'badge-neutral',
            DISPATCHED:       'badge-accent',
            IN_TRANSIT:       'badge-warning',
            OUT_FOR_DELIVERY: 'badge-warning',
            DELIVERED:        'badge-success',
            FAILED:           'badge-error',
            RETURNED:         'badge-neutral'
        };
        return map[status] ?? 'badge-neutral';
    }

    readonly statusLabel = (status: EnvioStatus): string => this.catalog.label('ESTADO_ENVIO', status);
}
