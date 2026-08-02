import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DevolucionService } from '../../services/devolucion.service';
import { Devolucion, DevolucionStatus } from '../../models/devolucion.model';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen } from '../../models/almacen.model';
import { EnvioService } from '../../services/envio.service';
import { Envio } from '../../models/envio.model';
import { envioSelectSource } from '../../components/select-sources';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-devoluciones-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        RichTextEditorComponent,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        PageHeaderComponent,
        DatePipe
    ],
    templateUrl: './devoluciones-page.component.html'
})
export class DevolucionesPageComponent implements OnInit {
    private readonly service       = inject(DevolucionService);
    private readonly almacenService = inject(AlmacenService);
    private readonly envioService  = inject(EnvioService);
    private readonly authService   = inject(AuthService);
    private readonly fb            = inject(FormBuilder);
    protected readonly catalog     = inject(CatalogService);

    /** Fuente del select "Envío" del alta: deriva orderId/shipmentId de un mismo envío. */
    readonly envioSource = envioSelectSource(this.envioService, () => this.companyId);

    // Data
    // Backend (GET /logistics/api/returns) devuelve Page<ReturnRequestResponse> — la
    // paginación y TODOS los filtros se resuelven en el backend, la vista nunca filtra.
    devoluciones = signal<Devolucion[]>([]);
    selected     = signal<Devolucion | null>(null);

    /** Almacenes de la empresa, para el select de filtro "Almacén de recepción" del toolbar. */
    almacenesFiltro = signal<Almacen[]>([]);

    // UI state
    loading         = signal(false);
    loadingDetail   = signal(false);
    error           = signal<string | null>(null);
    showDetail      = signal(false);
    actionLoading   = signal(false);
    actionError     = signal<string | null>(null);

    // Alta de devolución (drawer "Nueva Devolución")
    showCreate         = signal(false);
    creating           = signal(false);
    createError        = signal<string | null>(null);
    /** Envío elegido en el select — de aquí se deriva orderId (shipmentId es el mismo id). */
    selectedEnvio       = signal<Envio | null>(null);
    loadingSelectedEnvio = signal(false);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterStatus = signal('');
    filterReason = signal('');
    filterWarehouseId = signal('');
    filterRequestedAtDesde = signal<string | undefined>(undefined);
    filterRequestedAtHasta = signal<string | undefined>(undefined);
    filterRefundedAtDesde  = signal<string | undefined>(undefined);
    filterRefundedAtHasta  = signal<string | undefined>(undefined);
    filterReceivedAtDesde  = signal<string | undefined>(undefined);
    filterReceivedAtHasta  = signal<string | undefined>(undefined);

    // Acción drawer — reactive
    actionForm = this.fb.group({
        motivoRechazo:   ['', [Validators.required]],
        inspectionNotes: ['', [Validators.required]],
        refundAmount:    [0, [Validators.required, Validators.min(0.01)]],
        refundNotas:     ['']
    });

    // Alta drawer — reactive. shipmentId sale del select de envío; orderId se
    // deriva de ese mismo envío (Envio.orderId) al enviar, no es un control propio.
    createForm = this.fb.group({
        shipmentId: ['', [Validators.required]],
        customerId: ['', [Validators.required]],
        reason:     ['', [Validators.required]],
        description: ['']
    });

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única)
    // y de `almacenesFiltro` (lista dinámica cargada en ngOnInit).
    readonly estadoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_DEVOLUCION_LOGISTICA', 'status', 'Estado'),
        catalogFilter(this.catalog, 'MOTIVO_DEVOLUCION_LOGISTICA', 'reason', 'Motivo de devolución'),
        signalFilter('warehouseId', 'Almacén', this.almacenesFiltro,
            a => ({ value: a.id, label: a.nombre })),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'requestedAt', label: 'Fecha de solicitud' },
        { field: 'refundedAt', label: 'Fecha de reembolso' },
        { field: 'receivedAt', label: 'Fecha de recepción' },
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Devoluciones' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales). Ver /logistics/api/returns/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/returns/export`,
        filename: 'devoluciones',
        params: () => ({
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            reason: this.filterReason() || undefined,
            warehouseId: this.filterWarehouseId() || undefined,
            requestedAtDesde: this.filterRequestedAtDesde(),
            requestedAtHasta: this.filterRequestedAtHasta(),
            refundedAtDesde: this.filterRefundedAtDesde(),
            refundedAtHasta: this.filterRefundedAtHasta(),
            receivedAtDesde: this.filterReceivedAtDesde(),
            receivedAtHasta: this.filterReceivedAtHasta(),
        })
    };

    columns: TableColumn<Devolucion>[] = [
        { key: 'id', label: 'ID', render: (r) => r.id.slice(0, 8) + '…' },
        { key: 'orderId',   label: 'Pedido',  render: (r) => r.orderId?.slice(0, 8) + '…' || '—' },
        { key: 'reason',    label: 'Motivo',  render: (r) => r.reason || '—' },
        { key: 'refundAmount', label: 'Reembolso', align: 'right',
          render: (r) => r.refundAmount != null ? `S/ ${r.refundAmount.toFixed(2)}` : '—' },
        { key: 'requestedAt', label: 'Solicitado',
          render: (r) => new Date(r.requestedAt).toLocaleDateString('es-PE') },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeStatus(r.status)}">${this.catalog.label('ESTADO_DEVOLUCION_LOGISTICA', r.status)}</span>` }
    ];

    actions: TableAction<Devolucion>[] = [
        {
            label: 'Gestionar', icon: '⚙️', class: 'btn-view',
            onClick: (row) => this.openDetail(row)
        }
    ];

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadDevoluciones();
        this.loadAlmacenesFiltro();

        // Al elegir un envío en el drawer de alta, trae el registro completo
        // para derivar orderId (Envio.orderId) al enviar — el select solo emite el id.
        this.createForm.controls.shipmentId.valueChanges.subscribe((id: string | null) => {
            this.selectedEnvio.set(null);
            if (!id) return;
            this.loadingSelectedEnvio.set(true);
            this.envioService.getById(id, this.companyId).subscribe({
                next: (envio) => { this.selectedEnvio.set(envio); this.loadingSelectedEnvio.set(false); },
                error: () => { this.loadingSelectedEnvio.set(false); }
            });
        });
    }

    /** Almacenes activos para el select de filtro "Almacén de recepción" del toolbar. */
    private loadAlmacenesFiltro(): void {
        this.almacenService.getAlmacenes(this.companyId, { page: 0, size: PAGINATION.maxPageSize }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    loadDevoluciones() {
        this.loading.set(true);
        this.error.set(null);
        this.service.getDevoluciones(this.companyId, {
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            reason: this.filterReason() || undefined,
            warehouseId: this.filterWarehouseId() || undefined,
            requestedAtDesde: this.filterRequestedAtDesde(),
            requestedAtHasta: this.filterRequestedAtHasta(),
            refundedAtDesde: this.filterRefundedAtDesde(),
            refundedAtHasta: this.filterRefundedAtHasta(),
            receivedAtDesde: this.filterReceivedAtDesde(),
            receivedAtHasta: this.filterReceivedAtHasta()
        }).subscribe({
            next: (res) => {
                this.devoluciones.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar devoluciones.');
                this.loading.set(false);
            }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearch(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':      this.filterStatus.set(valor); break;
            case 'reason':      this.filterReason.set(valor); break;
            case 'warehouseId': this.filterWarehouseId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent) {
        switch (event.field) {
            case 'requestedAt':
                this.filterRequestedAtDesde.set(event.from ?? undefined);
                this.filterRequestedAtHasta.set(event.to ?? undefined);
                break;
            case 'refundedAt':
                this.filterRefundedAtDesde.set(event.from ?? undefined);
                this.filterRefundedAtHasta.set(event.to ?? undefined);
                break;
            case 'receivedAt':
                this.filterReceivedAtDesde.set(event.from ?? undefined);
                this.filterReceivedAtHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear() {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterReason.set('');
        this.filterWarehouseId.set('');
        this.filterRequestedAtDesde.set(undefined);
        this.filterRequestedAtHasta.set(undefined);
        this.filterRefundedAtDesde.set(undefined);
        this.filterRefundedAtHasta.set(undefined);
        this.filterReceivedAtDesde.set(undefined);
        this.filterReceivedAtHasta.set(undefined);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadDevoluciones();
    }

    // ── Alta ("Nueva Devolución") ─────────────────────────
    openCreate(): void {
        this.createForm.reset({ shipmentId: '', customerId: '', reason: '', description: '' });
        this.selectedEnvio.set(null);
        this.createError.set(null);
        this.showCreate.set(true);
    }

    closeCreate(): void {
        this.showCreate.set(false);
    }

    submitCreate(): void {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        const envio = this.selectedEnvio();
        if (!envio?.orderId) {
            this.createError.set('El envío seleccionado no tiene un pedido asociado.');
            return;
        }
        const v = this.createForm.getRawValue();
        this.creating.set(true);
        this.createError.set(null);
        this.service.create({
            orderId: envio.orderId,
            shipmentId: v.shipmentId!,
            reason: v.reason!,
            description: v.description || undefined
        }, v.customerId!).subscribe({
            next: () => {
                this.creating.set(false);
                this.closeCreate();
                this.loadDevoluciones();
            },
            error: (err: Error) => {
                this.creating.set(false);
                this.createError.set(err.message ?? 'Error al crear la devolución.');
            }
        });
    }

    // ── Detalle y workflow ───────────────────────────────
    openDetail(dev: Devolucion) {
        this.selected.set(dev);
        this.actionError.set(null);
        this.actionForm.reset({
            motivoRechazo:   '',
            inspectionNotes: '',
            refundAmount:    dev.refundAmount ?? 0,
            refundNotas:     ''
        });
        this.showDetail.set(true);
    }

    closeDetail() {
        this.showDetail.set(false);
        this.selected.set(null);
    }

    aprobar() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.aprobar(dev.id, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    rechazar() {
        const dev = this.selected();
        if (!dev) return;
        const motivoControl = this.actionForm.controls.motivoRechazo;
        motivoControl.markAsTouched();
        if (motivoControl.invalid) {
            this.actionError.set('Debe indicar el motivo del rechazo.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const motivo = motivoControl.value ?? '';
        this.service.rechazar(dev.id, motivo, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    marcarRecibida() {
        const dev = this.selected();
        if (!dev) return;
        this.actionLoading.set(true);
        this.service.marcarRecibida(dev.id, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    registrarInspeccion() {
        const dev = this.selected();
        if (!dev) return;
        const notesControl = this.actionForm.controls.inspectionNotes;
        notesControl.markAsTouched();
        if (notesControl.invalid) {
            this.actionError.set('Las notas de inspección son obligatorias.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const notes = notesControl.value ?? '';
        this.service.registrarInspeccion(dev.id, notes, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    registrarReembolso() {
        const dev = this.selected();
        if (!dev) return;
        const amountControl = this.actionForm.controls.refundAmount;
        amountControl.markAsTouched();
        if (amountControl.invalid) {
            this.actionError.set('El monto a reembolsar es obligatorio y debe ser mayor a 0.');
            return;
        }
        this.actionLoading.set(true);
        this.actionError.set(null);
        const amount = amountControl.value ?? 0;
        const notas = this.actionForm.value.refundNotas ?? '';
        this.service.registrarReembolso(dev.id, amount, notas, this.companyId).subscribe({
            next: (updated) => { this.selected.set(updated); this.actionLoading.set(false); this.loadDevoluciones(); },
            error: (err: Error) => { this.actionError.set(err.message); this.actionLoading.set(false); }
        });
    }

    badgeStatus(status: DevolucionStatus): string {
        const map: Record<DevolucionStatus, string> = {
            REQUESTED:               'badge-warning',
            APPROVED:                'badge-accent',
            REJECTED:                'badge-error',
            IN_TRANSIT_TO_WAREHOUSE: 'badge-accent',
            RECEIVED:                'badge-accent',
            INSPECTED:               'badge-warning',
            REFUNDED:                'badge-success',
            CANCELLED:               'badge-neutral'
        };
        return map[status] ?? 'badge-neutral';
    }
}
