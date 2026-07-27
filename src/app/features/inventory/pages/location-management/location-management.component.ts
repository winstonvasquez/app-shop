import {
    ChangeDetectionStrategy, Component, inject, signal, OnInit
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { Location, Warehouse } from '../../models/inventory.models';
import { CatalogService } from '@core/services/catalog.service';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION, ROUTES } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { warehouseSelectSource } from '../../components/select-sources';

@Component({
    selector: 'app-location-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent, ModalComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent, ButtonComponent,
        CatalogSelectComponent, ServerSearchSelectComponent
    ],
    templateUrl: './location-management.component.html',
    styleUrl: './location-management.component.scss'
})
export class LocationManagementComponent implements OnInit {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    readonly warehouseSource = warehouseSelectSource(this.api);

    warehouses = signal<Warehouse[]>([]);
    locations = signal<Location[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterWarehouseId = signal<number | null>(null);
    filterLocationType = signal('');
    filterActive = signal<boolean | null>(null);
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros select del toolbar. Almacén = lista dinámica cargada en ngOnInit;
    // tipo = catálogo de erp_parameters; estado = booleano (sin catálogo).
    filters: FilterConfig[] = [
        signalFilter('warehouseId', 'Todos los almacenes', this.warehouses,
            w => ({ value: w.id, label: `${w.code} — ${w.name}` })),
        catalogFilter(this.catalog, 'TIPO_UBICACION', 'locationType', 'Tipo de ubicación'),
        staticFilter('active', 'Estado', ACTIVO_OPTIONS)
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de alta' }
    ];

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showConfirmDelete = signal(false);
    pendingDeleteId = signal<number | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Ubicaciones' }
    ];

    columns: TableColumn<Location>[] = [
        { key: 'code',  label: 'Código',   sortable: true, width: '110px' },
        { key: 'name',  label: 'Nombre',   sortable: true, render: (r) => r.name ?? '—' },
        { key: 'aisle', label: 'Pasillo',  render: (r) => r.aisle ?? '—' },
        { key: 'rack',  label: 'Estante',  render: (r) => r.rack  ?? '—' },
        { key: 'shelf', label: 'Nivel',    render: (r) => r.shelf ?? '—' },
        { key: 'bin',   label: 'Posición', render: (r) => r.bin   ?? '—' },
        {
            key: 'active', label: 'Estado', html: true,
            render: (r) => r.active
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-error">Inactivo</span>'
        }
    ];

    actions: TableAction<Location>[] = [
        { label: 'Editar',   icon: 'edit',  class: 'btn-icon-edit',   onClick: (r) => this.openEdit(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.confirmDelete(r.id) }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/locations/export`,
        filename: 'ubicaciones',
        params: () => ({
            warehouseId: this.filterWarehouseId() ?? undefined,
            locationType: this.filterLocationType() || undefined,
            active: this.filterActive() ?? undefined,
            q: this.searchQuery() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined
        })
    };

    form: FormGroup = this.fb.nonNullable.group({
        warehouseId:  [null as number | null, Validators.required],
        code:         ['', [Validators.required, Validators.maxLength(20)]],
        name:         ['', [Validators.required, Validators.maxLength(200)]],
        description:  [''],
        aisle:        [''],
        rack:         [''],
        shelf:        [''],
        bin:          [''],
        locationType: [''],
        capacity:     [null as number | null],
        active:       [true]
    });

    ngOnInit(): void {
        this.loadWarehouses();
        this.loadLocations();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (data) => this.warehouses.set(data),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    /** Listado GLOBAL paginado — el almacén es un filtro opcional, no un requisito para listar. */
    loadLocations(): void {
        this.loading.set(true);
        this.error.set(null);
        this.api.searchLocationsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            warehouseId: this.filterWarehouseId() ?? undefined,
            locationType: this.filterLocationType() || undefined,
            active: this.filterActive() ?? undefined,
            q: this.searchQuery() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined
        }).subscribe({
            next: (res) => {
                this.locations.set(res.content ?? []);
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
        this.loadLocations();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        switch (event.field) {
            case 'warehouseId':
                this.filterWarehouseId.set(event.value != null && event.value !== '' ? Number(event.value) : null);
                break;
            case 'locationType':
                this.filterLocationType.set(event.value != null ? String(event.value) : '');
                break;
            case 'active':
                this.filterActive.set(event.value != null && event.value !== '' ? String(event.value) === 'true' : null);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadLocations();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'createdAt') return;
        this.filterCreatedAtDesde.set(event.from);
        this.filterCreatedAtHasta.set(event.to);
        this.currentPage.set(0);
        this.loadLocations();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterWarehouseId.set(null);
        this.filterLocationType.set('');
        this.filterActive.set(null);
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadLocations();
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.form.reset({ active: true, warehouseId: this.filterWarehouseId() });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(loc: Location): void {
        this.editMode.set(true);
        this.selectedId.set(loc.id);
        this.form.patchValue({ ...loc });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload = { ...v, warehouseId: Number(v.warehouseId) };
        const op = this.editMode()
            ? this.api.updateLocation(this.selectedId()!, payload)
            : this.api.createLocation(payload);
        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                this.loadLocations();
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    confirmDelete(id: number): void {
        this.pendingDeleteId.set(id);
        this.showConfirmDelete.set(true);
    }

    cancelDelete(): void {
        this.pendingDeleteId.set(null);
        this.showConfirmDelete.set(false);
    }

    executeDelete(): void {
        const id = this.pendingDeleteId();
        if (id === null) return;
        this.showConfirmDelete.set(false);
        this.api.deleteLocation(id).subscribe({
            next: () => { this.pendingDeleteId.set(null); this.loadLocations(); },
            error: (err: Error) => { this.pendingDeleteId.set(null); this.error.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadLocations();
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
