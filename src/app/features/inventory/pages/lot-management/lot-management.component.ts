import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { WmsApiService } from '../../services/wms-api.service';
import { Lot, LotExpirationAlert } from '../../models/wms-zone.models';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter, signalFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent } from '@shared/components';
import { PAGINATION, ROUTES } from '@shared/constants/app.constants';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { environment } from '@env/environment';

@Component({
    selector: 'app-lot-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent
    ],
    templateUrl: './lot-management.component.html',
    styleUrl: './lot-management.component.scss'
})
export class LotManagementComponent implements OnInit {
    private readonly api = inject(WmsApiService);
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);

    /** Filtro opcional de producto (búsqueda libre vía product-lookup, no un <select>). */
    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    lots = signal<Lot[]>([]);
    alertas = signal<LotExpirationAlert[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterActivo = signal<boolean | null>(null);
    filterEstadoVencimiento = signal('');
    filterProveedorNombre = signal('');
    filterVencimientoDesde = signal<string | null>(null);
    filterVencimientoHasta = signal<string | null>(null);
    filterFabricacionDesde = signal<string | null>(null);
    filterFabricacionHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<{ value: string; label: string }[]>([]);

    /**
     * `estadoVencimiento` es DERIVADO en el backend (no hay catálogo ESTADO_VENCIMIENTO_LOTE
     * seedeado) — los códigos VIGENTE/POR_VENCER/VENCIDO son el contrato exacto de la API.
     */
    filters: FilterConfig[] = [
        staticFilter('estadoVencimiento', 'Estado de vencimiento', [
            { value: 'VIGENTE', label: 'Vigente' },
            { value: 'POR_VENCER', label: 'Por vencer' },
            { value: 'VENCIDO', label: 'Vencido' }
        ]),
        staticFilter('activo', 'Estado del lote', ACTIVO_OPTIONS),
        signalFilter('proveedorNombre', 'Todos los proveedores', this.proveedoresFiltro, p => p)
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaVencimiento', label: 'Fecha de vencimiento' },
        { field: 'fechaFabricacion', label: 'Fecha de fabricación' }
    ];

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<string | null>(null);
    /** productoId (UUID) del lote en edición — independiente del filtro de producto del toolbar. */
    editingProductoId = signal<string | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Lotes' }
    ];

    columns: TableColumn<Lot>[] = [
        { key: 'loteNumero', label: 'N° Lote', sortable: true },
        { key: 'sku', label: 'SKU' },
        { key: 'fechaVencimiento', label: 'Vencimiento',
          render: (r) => r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString('es-PE') : '—' },
        { key: 'cantidadInicial', label: 'Cant. Inicial', align: 'right' },
        { key: 'cantidadActual', label: 'Cant. Actual', align: 'right' },
        { key: 'proveedorNombre', label: 'Proveedor', render: (r) => r.proveedorNombre ?? '—' },
        {
            key: 'activo', label: 'Estado', html: true,
            render: (r) => r.activo
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-neutral">Inactivo</span>'
        }
    ];

    actions: TableAction<Lot>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (r) => this.openEdit(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.eliminar(r.id) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sku: ['', Validators.required],
        loteNumero: ['', Validators.required],
        fechaFabricacion: [''],
        fechaVencimiento: [''],
        cantidadInicial: [0, [Validators.required, Validators.min(0)]],
        proveedorNombre: [''],
        notas: ['']
    });

    ngOnInit(): void {
        this.loadLots();
        this.loadAlertas();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar (GET /purchases/api/proveedores). */
    private loadProveedoresFiltro(): void {
        const params = new HttpParams()
            .set('estado', 'ACTIVO')
            .set('page', '0')
            .set('size', String(PAGINATION.maxPageSize));
        this.http.get<{ content?: { razonSocial: string }[] }>(
            `${environment.apiUrls.purchases}/api/proveedores`, { params }
        ).subscribe({
            next: (res) => this.proveedoresFiltro.set(
                (res.content ?? []).map(p => ({ value: p.razonSocial, label: p.razonSocial }))
            ),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.currentPage.set(0);
        this.loadLots();
    }

    /** Quita el filtro de producto y vuelve al listado global de lotes. */
    clearProductFilter(): void {
        this.currentProductId.set(null);
        this.currentProductName.set(null);
        this.currentPage.set(0);
        this.loadLots();
    }

    /** Listado GLOBAL paginado — el producto es un filtro opcional, no un requisito para listar. */
    loadLots(): void {
        this.loading.set(true);
        this.error.set(null);
        const productId = this.currentProductId();
        this.api.getLotsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            productoId: productId != null ? productIdToUuid(productId) : undefined,
            activo: this.filterActivo() ?? undefined,
            proveedorNombre: this.filterProveedorNombre() || undefined,
            estadoVencimiento: this.filterEstadoVencimiento() || undefined,
            vencimientoDesde: this.filterVencimientoDesde() ?? undefined,
            vencimientoHasta: this.filterVencimientoHasta() ?? undefined,
            fabricacionDesde: this.filterFabricacionDesde() ?? undefined,
            fabricacionHasta: this.filterFabricacionHasta() ?? undefined,
            q: this.searchQuery() || undefined
        }).subscribe({
            next: (res) => {
                this.lots.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Alertas de vencimiento próximo (30 días) — informativo, no filtra por producto actual. */
    loadAlertas(): void {
        this.api.getLotsExpiringSoon(30).subscribe({ next: (a) => this.alertas.set(a) });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadLots();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        switch (event.field) {
            case 'estadoVencimiento':
                this.filterEstadoVencimiento.set(event.value != null ? String(event.value) : '');
                break;
            case 'activo':
                this.filterActivo.set(event.value != null && event.value !== '' ? String(event.value) === 'true' : null);
                break;
            case 'proveedorNombre':
                this.filterProveedorNombre.set(event.value != null ? String(event.value) : '');
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadLots();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaVencimiento') {
            this.filterVencimientoDesde.set(event.from);
            this.filterVencimientoHasta.set(event.to);
        } else if (event.field === 'fechaFabricacion') {
            this.filterFabricacionDesde.set(event.from);
            this.filterFabricacionHasta.set(event.to);
        } else {
            return;
        }
        this.currentPage.set(0);
        this.loadLots();
    }

    /** "Limpiar filtros": resetea todo (incluido el producto) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterActivo.set(null);
        this.filterEstadoVencimiento.set('');
        this.filterProveedorNombre.set('');
        this.filterVencimientoDesde.set(null);
        this.filterVencimientoHasta.set(null);
        this.filterFabricacionDesde.set(null);
        this.filterFabricacionHasta.set(null);
        this.currentProductId.set(null);
        this.currentProductName.set(null);
        this.currentPage.set(0);
        this.loadLots();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadLots();
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.editingProductoId.set(null);
        this.form.reset({ cantidadInicial: 0 });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(lot: Lot): void {
        this.editMode.set(true);
        this.selectedId.set(lot.id);
        this.editingProductoId.set(lot.productoId);
        this.form.patchValue({ ...lot });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        const productoId = this.editMode() ? this.editingProductoId() : this.productoIdParaCrear();
        if (!productoId) {
            this.submitError.set('Selecciona un producto para crear el lote.');
            return;
        }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload = { ...v, productoId };
        const op = this.editMode()
            ? this.api.updateLot(this.selectedId()!, payload)
            : this.api.createLot(payload);
        op.subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadLots(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    /** Para crear un lote nuevo se exige tener un producto elegido vía product-lookup. */
    private productoIdParaCrear(): string | null {
        const productId = this.currentProductId();
        return productId != null ? productIdToUuid(productId) : null;
    }

    eliminar(id: string): void {
        this.api.deleteLot(id).subscribe({
            next: () => this.loadLots(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
