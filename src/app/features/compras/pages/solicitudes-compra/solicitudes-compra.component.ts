import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SolicitudCompraService } from '../../services/solicitud-compra.service';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { SolicitudCompra, SolicitudCompraItem } from '../../models/solicitud-compra.model';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent, SortEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-solicitudes-compra',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        ButtonComponent,
        CatalogSelectComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        DataTableComponent,
    ],
    templateUrl: './solicitudes-compra.component.html',
})
export class SolicitudesCompraComponent implements OnInit {
    private readonly solicitudService = inject(SolicitudCompraService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);
    protected readonly catalog = inject(CatalogService);

    // Data
    solicitudes = signal<SolicitudCompra[]>([]);
    selectedSolicitud = signal<SolicitudCompra | null>(null);

    // UI state
    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);
    showRechazarModal = signal(false);
    showConvertirModal = signal(false);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterEstado = signal('');
    filterPrioridad = signal('');
    filterFechaRequeridaDesde = signal<string | null>(null);
    filterFechaRequeridaHasta = signal<string | null>(null);
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('createdAt');
    sortDirection = signal<'asc' | 'desc'>('desc');

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_SOLICITUD_COMPRA', 'estado', 'Todos los estados'),
        catalogFilter(this.catalog, 'PRIORIDAD_SOLICITUD', 'prioridad', 'Prioridad'),
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaRequerida', label: 'Fecha requerida' },
        { field: 'createdAt', label: 'Fecha de solicitud' },
    ];

    columns: TableColumn<SolicitudCompra>[] = [
        { key: 'codigo', label: 'Código', sortable: true, width: '130px' },
        { key: 'solicitanteNombre', label: 'Solicitante' },
        { key: 'departamento', label: 'Departamento', render: (r) => r.departamento || '—' },
        { key: 'prioridad', label: 'Prioridad', render: (r) => r.prioridad ?? '—' },
        { key: 'fechaRequerida', label: 'Fecha Req.', sortable: true, render: (r) => r.fechaRequerida || '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="${this.getBadgeClass(r.estado)}">${this.getEstadoLabel(r.estado)}</span>`
        },
    ];

    actions: TableAction<SolicitudCompra>[] = [
        {
            label: 'Ver', icon: '👁️', class: 'btn-view',
            onClick: (row) => this.openDetail(row)
        },
    ];

    // Computed
    hasSolicitudes = computed(() => this.solicitudes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasSolicitudes());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Solicitudes' },
    ];

    // Forms
    solicitudForm = this.fb.group({
        justificacion: ['', Validators.required],
        departamento: [''],
        prioridad: ['NORMAL'],
        fechaRequerida: [''],
        items: this.fb.array([this.createItemFormGroup()]),
    });

    rechazarForm = this.fb.group({
        motivoRechazo: ['', Validators.required],
    });

    convertirForm = this.fb.group({
        proveedorId: ['', Validators.required],
        condicionPago: ['CONTADO', Validators.required],
        almacenDestino: [''],
    });

    get itemsArray(): FormArray {
        return this.solicitudForm.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadSolicitudes();
    }

    loadSolicitudes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.solicitudService
            .getSolicitudes({
                page: this.currentPage(),
                size: this.pageSize(),
                q: this.searchQuery() || undefined,
                estado: this.filterEstado() || undefined,
                prioridad: this.filterPrioridad() || undefined,
                fechaRequeridaDesde: this.filterFechaRequeridaDesde() || undefined,
                fechaRequeridaHasta: this.filterFechaRequeridaHasta() || undefined,
                createdAtDesde: this.filterCreatedAtDesde() || undefined,
                createdAtHasta: this.filterCreatedAtHasta() || undefined,
                sortField: this.sortField() || undefined,
                sortDirection: this.sortDirection(),
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
                    this.error.set('Error al cargar solicitudes de compra');
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
        this.loadSolicitudes();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':    this.filterEstado.set(valor); break;
            case 'prioridad': this.filterPrioridad.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadSolicitudes();
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
        this.loadSolicitudes();
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
        this.loadSolicitudes();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadSolicitudes();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadSolicitudes();
    }

    openCreateForm(): void {
        this.solicitudForm.reset({ prioridad: 'NORMAL' });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemFormGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    openDetail(solicitud: SolicitudCompra): void {
        this.selectedSolicitud.set(solicitud);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedSolicitud.set(null);
    }

    addItem(): void {
        this.itemsArray.push(this.createItemFormGroup());
    }

    removeItem(index: number): void {
        if (this.itemsArray.length > 1) {
            this.itemsArray.removeAt(index);
        }
    }

    createSolicitud(): void {
        if (this.solicitudForm.invalid) return;
        const user = this.authService.currentUser();
        if (!user) return;

        const formValue = this.solicitudForm.value;
        const items: SolicitudCompraItem[] = (formValue.items ?? []).map((i: Record<string, unknown>) => ({
            productoNombre: i['productoNombre'] as string,
            sku: i['sku'] as string | undefined,
            cantidad: Number(i['cantidad']),
            unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
            precioEstimado: i['precioEstimado'] ? Number(i['precioEstimado']) : undefined,
            observaciones: i['observaciones'] as string | undefined,
        }));

        const payload: Partial<SolicitudCompra> = {
            solicitanteNombre: user.username,
            departamento: formValue.departamento ?? undefined,
            justificacion: formValue.justificacion ?? '',
            prioridad: formValue.prioridad ?? 'NORMAL',
            fechaRequerida: formValue.fechaRequerida ?? undefined,
            items,
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.solicitudService.createSolicitud(payload, String(user.userId), user.username).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadSolicitudes();
            },
            error: (err) => {
                this.submitError.set('Error al crear la solicitud');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    enviarSolicitud(id: string): void {
        this.solicitudService.enviarSolicitud(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al enviar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    aprobarSolicitud(id: string): void {
        const user = this.authService.currentUser();
        if (!user) return;
        this.solicitudService.aprobarSolicitud(id, String(user.userId)).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al aprobar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openRechazarModal(): void {
        this.rechazarForm.reset();
        this.showRechazarModal.set(true);
    }

    closeRechazarModal(): void {
        this.showRechazarModal.set(false);
    }

    confirmarRechazo(): void {
        if (this.rechazarForm.invalid) return;
        const solicitud = this.selectedSolicitud();
        if (!solicitud?.id) return;

        const motivo = this.rechazarForm.value.motivoRechazo ?? '';
        this.solicitudService.rechazarSolicitud(solicitud.id, motivo).subscribe({
            next: () => {
                this.showRechazarModal.set(false);
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al rechazar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openConvertirModal(): void {
        this.convertirForm.reset({ condicionPago: 'CONTADO' });
        this.showConvertirModal.set(true);
    }

    closeConvertirModal(): void {
        this.showConvertirModal.set(false);
    }

    confirmarConversion(): void {
        if (this.convertirForm.invalid) return;
        const solicitud = this.selectedSolicitud();
        if (!solicitud?.id) return;

        const { proveedorId, condicionPago, almacenDestino } = this.convertirForm.value;
        this.solicitudService
            .convertirAOrdenCompra(
                solicitud.id,
                proveedorId ?? '',
                condicionPago ?? '',
                almacenDestino ?? undefined
            )
            .subscribe({
                next: () => {
                    this.showConvertirModal.set(false);
                    this.closeDetail();
                    this.loadSolicitudes();
                },
                error: (err) => {
                    this.actionError.set('Error al convertir la solicitud en OC');
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    cancelarSolicitud(id: string): void {
        if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;
        this.solicitudService.cancelarSolicitud(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
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

    private createItemFormGroup(): FormGroup {
        return this.fb.group({
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            unidadMedida: ['UNIDAD'],
            precioEstimado: [null],
            observaciones: [''],
        });
    }
}
