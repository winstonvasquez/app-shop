import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { DeliveryRouteService } from '../../services/delivery-route.service';
import { DeliveryRoute, GenerateRouteBody } from '../../models/delivery-route.model';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen } from '../../models/almacen.model';
import { EnvioService } from '../../services/envio.service';
import { Envio } from '../../models/envio.model';
import { almacenSelectSource } from '../../components/select-sources';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-delivery-routes',
    standalone: true,
    imports: [
        ReactiveFormsModule, ButtonComponent, AlertComponent, PageHeaderComponent,
        DataTableComponent, DrawerComponent, DateInputComponent, ServerSearchSelectComponent
    ],
    templateUrl: './delivery-routes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryRoutesComponent implements OnInit {
    private readonly routeService = inject(DeliveryRouteService);
    private readonly almacenService = inject(AlmacenService);
    private readonly envioService = inject(EnvioService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    /** Fuente del select "Almacén de origen" del drawer de alta (mismo adapter que el filtro del toolbar). */
    readonly almacenSource = almacenSelectSource(
        this.almacenService, () => this.authService.currentUser()?.activeCompanyId);

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Rutas de Entrega' }
    ];

    routes = signal<DeliveryRoute[]>([]);
    loading = signal(false);
    actionId = signal<string | null>(null);
    error = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    // ── Alta de ruta (drawer "Nueva ruta") ──────────────────────────────
    showCreateDrawer = signal(false);
    creatingRoute = signal(false);
    createError = signal<string | null>(null);
    /** Envíos PENDING_DISPATCH disponibles para incluir en la ruta nueva. */
    pendingShipments = signal<Envio[]>([]);
    loadingPendingShipments = signal(false);
    selectedShipmentIds = signal<Set<string>>(new Set());

    createForm: FormGroup = this.fb.group({
        date: ['', Validators.required],
        warehouseId: ['', Validators.required],
        driverName: [''],
        vehiclePlate: ['']
    });

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterStatus = signal('');
    filterWarehouseId = signal('');
    filterRouteDateDesde = signal<string | null>(null);
    filterRouteDateHasta = signal<string | null>(null);
    filterStartedAtDesde = signal<string | null>(null);
    filterStartedAtHasta = signal<string | null>(null);

    /** Almacenes activos para el select de filtro del toolbar. */
    almacenesFiltro = signal<Almacen[]>([]);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros select del toolbar. El estado sale de erp_parameters (ESTADO_RUTA_ENTREGA);
    // el almacén de salida, de la lista cargada en ngOnInit.
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_RUTA_ENTREGA', 'status', 'Estado'),
        signalFilter('warehouseId', 'Almacén', this.almacenesFiltro,
            a => ({ value: a.id, label: a.nombre }))
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'routeDate', label: 'Fecha de ruta' },
        { field: 'startedAt', label: 'Fecha de inicio' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros que el listado. Ver /logistics/api/routes/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/routes/export`,
        filename: 'rutas-entrega',
        params: () => ({
            q: this.searchQuery(),
            status: this.filterStatus(),
            warehouseId: this.filterWarehouseId(),
            routeDateDesde: this.filterRouteDateDesde() ?? undefined,
            routeDateHasta: this.filterRouteDateHasta() ?? undefined,
            startedAtDesde: this.filterStartedAtDesde() ?? undefined,
            startedAtHasta: this.filterStartedAtHasta() ?? undefined
        })
    };

    readonly columns: TableColumn<DeliveryRoute>[] = [
        {
            key: 'id', label: 'ID', html: true,
            render: r => `<span class="font-mono text-sm" style="color:var(--color-text-muted)">${r.id.slice(0, 8)}…</span>`
        },
        {
            key: 'createdAt', label: 'Fecha Creación',
            render: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-PE') + ' ' + new Date(r.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
        },
        { key: 'driverId', label: 'Conductor', render: r => r.driverId ?? '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: r => `<span class="badge ${this.statusBadgeClass(r.status)}">${this.catalog.label('ESTADO_RUTA_ENTREGA', r.status)}</span>`
        },
        { key: 'stops', label: 'Paradas', align: 'right', render: r => String(r.stops?.length ?? 0) },
        {
            key: 'startedAt', label: 'Iniciado',
            render: r => r.startedAt ? new Date(r.startedAt).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'completedAt', label: 'Completado',
            render: r => r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-PE') : '—'
        },
    ];

    readonly actions: TableAction<DeliveryRoute>[] = [
        {
            label: 'Iniciar', icon: 'check', class: 'btn-view',
            show: r => r.status === 'PLANNED',
            onClick: r => this.startRoute(r.id)
        },
        {
            label: 'Completar', icon: 'check', class: 'btn-view',
            show: r => r.status === 'IN_PROGRESS',
            onClick: r => this.completeRoute(r.id)
        },
    ];

    ngOnInit(): void {
        this.loadRoutes();
        this.loadAlmacenesFiltro();
    }

    /** Almacenes para el select de filtro "Almacén de salida" del toolbar. */
    private loadAlmacenesFiltro(): void {
        const companyId = String(this.authService.currentUser()?.activeCompanyId ?? '');
        if (!companyId) { this.almacenesFiltro.set([]); return; }
        this.almacenService.getAlmacenes(companyId, { page: 0, size: 100 }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadRoutes();
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadRoutes();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':      this.filterStatus.set(valor); break;
            case 'warehouseId': this.filterWarehouseId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRoutes();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'routeDate':
                this.filterRouteDateDesde.set(event.from);
                this.filterRouteDateHasta.set(event.to);
                break;
            case 'startedAt':
                this.filterStartedAtDesde.set(event.from);
                this.filterStartedAtHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRoutes();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterWarehouseId.set('');
        this.filterRouteDateDesde.set(null);
        this.filterRouteDateHasta.set(null);
        this.filterStartedAtDesde.set(null);
        this.filterStartedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadRoutes();
    }

    loadRoutes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.routeService.list({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            warehouseId: this.filterWarehouseId() || undefined,
            routeDateDesde: this.filterRouteDateDesde() || undefined,
            routeDateHasta: this.filterRouteDateHasta() || undefined,
            startedAtDesde: this.filterStartedAtDesde() || undefined,
            startedAtHasta: this.filterStartedAtHasta() || undefined
        }).subscribe({
            next: (page) => {
                this.routes.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las rutas de entrega');
                this.loading.set(false);
            }
        });
    }

    startRoute(id: string): void {
        this.actionId.set(id);
        this.routeService.start(id).subscribe({
            next: (updated) => {
                this.routes.update(list => list.map(r => r.id === id ? updated : r));
                this.actionId.set(null);
                this.showSuccess('Ruta iniciada');
            },
            error: () => {
                this.error.set('Error al iniciar la ruta');
                this.actionId.set(null);
            }
        });
    }

    completeRoute(id: string): void {
        this.actionId.set(id);
        this.routeService.complete(id).subscribe({
            next: (updated) => {
                this.routes.update(list => list.map(r => r.id === id ? updated : r));
                this.actionId.set(null);
                this.showSuccess('Ruta completada');
            },
            error: () => {
                this.error.set('Error al completar la ruta');
                this.actionId.set(null);
            }
        });
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), NOTIFICATION_DURATION.medium);
    }

    // ── Alta de ruta (drawer "Nueva ruta") ──────────────────────────────
    openCreateDrawer(): void {
        this.createError.set(null);
        this.createForm.reset({ date: '', warehouseId: '', driverName: '', vehiclePlate: '' });
        this.selectedShipmentIds.set(new Set());
        this.loadPendingShipments();
        this.showCreateDrawer.set(true);
    }

    closeCreateDrawer(): void {
        this.showCreateDrawer.set(false);
    }

    /** Envíos PENDING_DISPATCH del tenant activo, candidatos a incluir en la ruta. */
    private loadPendingShipments(): void {
        const companyId = String(this.authService.currentUser()?.activeCompanyId ?? '');
        if (!companyId) { this.pendingShipments.set([]); return; }
        this.loadingPendingShipments.set(true);
        this.envioService.getEnvios(companyId, { status: 'PENDING_DISPATCH', size: 100 }).subscribe({
            next: (res) => {
                this.pendingShipments.set(res.content ?? []);
                this.loadingPendingShipments.set(false);
            },
            error: () => {
                this.pendingShipments.set([]);
                this.loadingPendingShipments.set(false);
            }
        });
    }

    isShipmentSelected(id: string): boolean {
        return this.selectedShipmentIds().has(id);
    }

    toggleShipment(id: string): void {
        this.selectedShipmentIds.update(set => {
            const next = new Set(set);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    submitGenerate(): void {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        const shipmentIds = Array.from(this.selectedShipmentIds());
        if (shipmentIds.length === 0) {
            this.createError.set('Seleccione al menos un envío pendiente de despacho.');
            return;
        }
        const v = this.createForm.getRawValue();
        const body: GenerateRouteBody = {
            date: v.date,
            warehouseId: v.warehouseId,
            shipmentIds,
            driverName: v.driverName || undefined,
            vehiclePlate: v.vehiclePlate || undefined
        };
        this.creatingRoute.set(true);
        this.createError.set(null);
        this.routeService.generate(body).subscribe({
            next: () => {
                this.creatingRoute.set(false);
                this.closeCreateDrawer();
                this.loadRoutes();
                this.showSuccess('Ruta generada');
            },
            error: (err: Error) => {
                this.creatingRoute.set(false);
                this.createError.set(err.message ?? 'Error al generar la ruta.');
            }
        });
    }

    statusBadgeClass(status: string): string {
        switch (status) {
            case 'PLANNED': return 'badge-neutral';
            case 'IN_PROGRESS': return 'badge-warning';
            case 'COMPLETED': return 'badge-success';
            case 'CANCELLED': return 'badge-error';
            default: return 'badge-neutral';
        }
    }

    statusLabel(status: string): string {
        switch (status) {
            case 'PLANNED': return 'Planificado';
            case 'IN_PROGRESS': return 'En Ruta';
            case 'COMPLETED': return 'Completado';
            case 'CANCELLED': return 'Cancelado';
            default: return status;
        }
    }
}
