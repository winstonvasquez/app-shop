import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { SerialNumberWms, SerialStatusWms } from '../../models/wms-zone.models';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { CatalogService } from '@core/services/catalog.service';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { PAGINATION, ROUTES } from '@shared/constants/app.constants';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

@Component({
    selector: 'app-serial-number-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent,
        ButtonComponent, CatalogSelectComponent, ProductLookupComponent
    ],
    templateUrl: './serial-number-management.component.html',
    styleUrl: './serial-number-management.component.scss'
})
export class SerialNumberManagementComponent implements OnInit {
    private readonly api = inject(WmsApiService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    /** Filtro opcional de producto (búsqueda libre vía product-lookup, no un <select>). */
    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    seriales = signal<SerialNumberWms[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterStatus = signal('');
    filterFechaCreacionDesde = signal<string | null>(null);
    filterFechaCreacionHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_SERIAL_WMS', 'status', 'Estado')
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de alta' }
    ];

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showStatusDrawer = signal(false);
    statusTarget = signal<SerialNumberWms | null>(null);
    statusSubmitting = signal(false);
    statusError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Números de Serie' }
    ];

    columns: TableColumn<SerialNumberWms>[] = [
        { key: 'serialNumber', label: 'N° Serie', sortable: true },
        { key: 'sku', label: 'SKU' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<SerialStatusWms, string> = {
                    AVAILABLE: 'badge-success', RESERVED: 'badge-warning',
                    SOLD: 'badge-neutral', RETURNED: 'badge-accent', DEFECTIVE: 'badge-error'
                };
                return `<span class="badge ${cls[r.status]}">${this.catalog.label('ESTADO_SERIAL_WMS', r.status)}</span>`;
            }
        },
        { key: 'currentLocation', label: 'Ubicación', render: (r) => r.currentLocation ?? '—' },
        { key: 'notas', label: 'Notas', render: (r) => r.notas ?? '—' }
    ];

    actions: TableAction<SerialNumberWms>[] = [
        { label: 'Cambiar estado', class: 'btn btn-secondary', onClick: (r) => this.openStatusChange(r) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sku: ['', Validators.required],
        serialNumber: ['', Validators.required],
        currentLocation: [''],
        notas: ['']
    });

    statusForm: FormGroup = this.fb.nonNullable.group({
        status: ['', Validators.required]
    });

    ngOnInit(): void {
        this.loadSeriales();
    }

    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.currentPage.set(0);
        this.loadSeriales();
    }

    /** Quita el filtro de producto y vuelve al listado global de números de serie. */
    clearProductFilter(): void {
        this.currentProductId.set(null);
        this.currentProductName.set(null);
        this.currentPage.set(0);
        this.loadSeriales();
    }

    /**
     * Listado GLOBAL paginado — el producto es un filtro opcional, no un requisito.
     * IMPORTANTE: el backend devuelve `Page<SerialNumberResponse>` (antes era `List`).
     */
    loadSeriales(): void {
        this.loading.set(true);
        this.error.set(null);
        const productId = this.currentProductId();
        this.api.listarSeriales({
            page: this.currentPage(),
            size: this.pageSize(),
            productoId: productId != null ? productIdToUuid(productId) : undefined,
            status: (this.filterStatus() || undefined) as SerialStatusWms | undefined,
            q: this.searchQuery() || undefined,
            fechaCreacionDesde: this.filterFechaCreacionDesde() ?? undefined,
            fechaCreacionHasta: this.filterFechaCreacionHasta() ?? undefined
        }).subscribe({
            next: (res) => {
                this.seriales.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadSeriales();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'status') return;
        this.filterStatus.set(event.value != null ? String(event.value) : '');
        this.currentPage.set(0);
        this.loadSeriales();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaCreacion') return;
        this.filterFechaCreacionDesde.set(event.from);
        this.filterFechaCreacionHasta.set(event.to);
        this.currentPage.set(0);
        this.loadSeriales();
    }

    /** "Limpiar filtros": resetea todo (incluido el producto) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterFechaCreacionDesde.set(null);
        this.filterFechaCreacionHasta.set(null);
        this.currentProductId.set(null);
        this.currentProductName.set(null);
        this.currentPage.set(0);
        this.loadSeriales();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadSeriales();
    }

    openCreate(): void {
        this.form.reset();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        const productId = this.currentProductId();
        if (productId === null || this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        this.api.registrarSerial({ ...v, productoId: productIdToUuid(productId) }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                this.info.set('Número de serie registrado.');
                this.loadSeriales();
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    openStatusChange(serial: SerialNumberWms): void {
        this.statusTarget.set(serial);
        this.statusForm.reset({ status: serial.status });
        this.statusError.set(null);
        this.showStatusDrawer.set(true);
    }

    closeStatusDrawer(): void { this.showStatusDrawer.set(false); this.statusTarget.set(null); }

    submitStatusChange(): void {
        const target = this.statusTarget();
        if (!target || this.statusForm.invalid) return;
        this.statusSubmitting.set(true);
        const status = this.statusForm.getRawValue().status as SerialStatusWms;
        this.api.cambiarStatusSerial(target.id, status).subscribe({
            next: () => {
                this.statusSubmitting.set(false);
                this.closeStatusDrawer();
                this.info.set(`Serial ${target.serialNumber} cambiado a ${status}.`);
                this.loadSeriales();
            },
            error: (err: Error) => { this.statusSubmitting.set(false); this.statusError.set(err.message); }
        });
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
