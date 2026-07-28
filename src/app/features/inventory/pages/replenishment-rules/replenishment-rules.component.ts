import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { CreateReplenishmentRuleRequest, ReplenishmentRule } from '../../models/wms-zone.models';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { AlmacenService } from '@features/logistica/services/almacen.service';
import { almacenSelectSource } from '@features/logistica/components/select-sources';
import { Almacen } from '@features/logistica/models/almacen.model';
import { ForecastService } from '@features/logistica/services/forecast.service';
import { ReorderSuggestion } from '@features/logistica/models/forecast.model';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { ROUTES } from '@shared/constants/app.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-replenishment-rules',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent,
        ButtonComponent, ProductLookupComponent, ServerSearchSelectComponent,
        CatalogSelectComponent
    ],
    templateUrl: './replenishment-rules.component.html',
    styleUrl: './replenishment-rules.component.scss'
})
export class ReplenishmentRulesComponent {
    private readonly api = inject(WmsApiService);
    private readonly almacenApi = inject(AlmacenService);
    private readonly forecastApi = inject(ForecastService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    readonly almacenSource = almacenSelectSource(this.almacenApi, () => this.authService.currentUser()?.activeCompanyId);

    rules = signal<ReplenishmentRule[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);

    /** Sugerencias de reposición calculadas por DemandForecastService (forecast del próximo mes). */
    suggestions = signal<ReorderSuggestion[]>([]);
    suggestionsLoading = signal(false);
    suggestionsError = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterStatus = signal('');
    filterAlmacenId = signal('');
    filterAutoCreatePo = signal('');
    filterLastTriggeredAtDesde = signal<string | null>(null);
    filterLastTriggeredAtHasta = signal<string | null>(null);
    filterLastPoCreatedAtDesde = signal<string | null>(null);
    filterLastPoCreatedAtHasta = signal<string | null>(null);
    searchQuery = signal('');

    /** Almacenes para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    almacenesFiltro = signal<Almacen[]>([]);

    // Filtros select del toolbar. El estado sale de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_REGLA_REPOSICION', 'status', 'Estado'),
        signalFilter('almacenId', 'Almacén', this.almacenesFiltro,
            a => ({ value: a.id, label: a.nombre })),
        staticFilter('autoCreatePo', 'Modo de reposición', [
            { value: 'true', label: 'Automática' },
            { value: 'false', label: 'Manual' }
        ])
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'lastTriggeredAt', label: 'Última ejecución' },
        { field: 'lastPoCreatedAt', label: 'Última OC generada' }
    ];

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<string | null>(null);
    /** UUID sintético del producto — en edición viene de rule.productoId, en alta se deriva del lookup. */
    selectedProductoIdUuid = signal<string | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    creatingPoId = signal<string | null>(null);

    readonly autoCreatePoWarning = computed(() => this.form.get('autoCreatePo')?.value === true);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Reglas de Reposición' }
    ];

    columns: TableColumn<ReplenishmentRule>[] = [
        { key: 'sku', label: 'SKU' },
        { key: 'productoNombre', label: 'Producto', render: (r) => r.productoNombre ?? '—' },
        { key: 'reorderPoint', label: 'Punto Reorden', align: 'right' },
        { key: 'reorderQuantity', label: 'Cant. Reposición', align: 'right' },
        {
            key: 'autoCreatePo', label: 'Auto-OC', html: true,
            render: (r) => r.autoCreatePo
                ? '<span class="badge badge-warning">Automática</span>'
                : '<span class="badge badge-neutral">Manual</span>'
        },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls = r.status === 'ACTIVE' ? 'badge-success' : r.status === 'PAUSED' ? 'badge-warning' : 'badge-neutral';
                return `<span class="badge ${cls}">${this.catalog.label('ESTADO_REGLA_REPOSICION', r.status)}</span>`;
            }
        },
        { key: 'lastTriggeredAt', label: 'Última ejecución',
          render: (r) => r.lastTriggeredAt ? new Date(r.lastTriggeredAt).toLocaleString('es-PE') : '—' }
    ];

    actions: TableAction<ReplenishmentRule>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (r) => this.openEdit(r) },
        {
            label: 'Pausar', class: 'btn btn-secondary',
            show: (r) => r.status === 'ACTIVE',
            onClick: (r) => this.cambiarStatus(r, 'PAUSED')
        },
        {
            label: 'Reactivar', class: 'btn btn-secondary',
            show: (r) => r.status !== 'ACTIVE',
            onClick: (r) => this.cambiarStatus(r, 'ACTIVE')
        },
        {
            label: 'Crear OC ahora', class: 'btn btn-primary',
            onClick: (r) => this.crearOc(r)
        },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.eliminar(r.id) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        almacenId: [null as string | null],
        sku: ['', Validators.required],
        productoNombre: [''],
        reorderPoint: [0, [Validators.required, Validators.min(0)]],
        reorderQuantity: [1, [Validators.required, Validators.min(1)]],
        preferredSupplierName: [''],
        maxUnitCost: [null as number | null],
        autoCreatePo: [false],
        status: ['ACTIVE']
    });

    /** Estado con el que se abrió la regla — sirve para detectar si el usuario lo cambió. */
    private readonly statusOriginal = signal('ACTIVE');

    /**
     * Bloqueo único de campos del drawer:
     * - `sku` identifica el producto de la regla junto al `productoId`: editable al crear,
     *   bloqueado al editar (cambiarlo desalinearía la regla del producto que dispara).
     * - `status` solo existe una vez creada la regla (el backend la da de alta en ACTIVE):
     *   bloqueado en el alta, habilitado en edición para poder pausar/reactivar.
     *   De ahí el `!this.editMode()` (bloqueo invertido respecto a `sku`).
     */
    private bloquearCampos(): void {
        bloquearEnEdicion(this.form, ['sku'], this.editMode());
        bloquearEnEdicion(this.form, ['status'], !this.editMode());
    }

    onProductSelected(p: ProductResponse): void {
        this.selectedProductoIdUuid.set(productIdToUuid(p.id));
        this.form.patchValue({ productoNombre: p.nombre });
    }

    loadRules(): void {
        this.loading.set(true);
        this.api.getReplenishmentRules({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            almacenId: this.filterAlmacenId() || undefined,
            autoCreatePo: this.filterAutoCreatePo() === '' ? undefined : this.filterAutoCreatePo() === 'true',
            lastTriggeredAtDesde: this.filterLastTriggeredAtDesde() || undefined,
            lastTriggeredAtHasta: this.filterLastTriggeredAtHasta() || undefined,
            lastPoCreatedAtDesde: this.filterLastPoCreatedAtDesde() || undefined,
            lastPoCreatedAtHasta: this.filterLastPoCreatedAtHasta() || undefined
        }).subscribe({
            next: (res) => {
                this.rules.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadRules();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':        this.filterStatus.set(valor); break;
            case 'almacenId':     this.filterAlmacenId.set(valor); break;
            case 'autoCreatePo':  this.filterAutoCreatePo.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRules();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'lastTriggeredAt':
                this.filterLastTriggeredAtDesde.set(event.from);
                this.filterLastTriggeredAtHasta.set(event.to);
                break;
            case 'lastPoCreatedAt':
                this.filterLastPoCreatedAtDesde.set(event.from);
                this.filterLastPoCreatedAtHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadRules();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterAlmacenId.set('');
        this.filterAutoCreatePo.set('');
        this.filterLastTriggeredAtDesde.set(null);
        this.filterLastTriggeredAtHasta.set(null);
        this.filterLastPoCreatedAtDesde.set(null);
        this.filterLastPoCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadRules();
    }

    /** Almacenes para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    private loadAlmacenesFiltro(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (companyId === undefined || companyId === null) { this.almacenesFiltro.set([]); return; }
        this.almacenApi.getAlmacenes(String(companyId), { size: 100 }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    constructor() {
        this.loadAlmacenesFiltro();
        this.loadRules();
        this.loadSuggestions();
    }

    loadSuggestions(): void {
        this.suggestionsLoading.set(true);
        this.forecastApi.getReorderSuggestions().subscribe({
            next: (res) => {
                this.suggestions.set(res);
                this.suggestionsLoading.set(false);
            },
            error: (err: Error) => {
                this.suggestionsError.set(err.message);
                this.suggestionsLoading.set(false);
            }
        });
    }

    /** Abre el formulario de alta pre-rellenado con los datos de la sugerencia de reorden. */
    crearReglaDesdeSugerencia(s: ReorderSuggestion): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.selectedProductoIdUuid.set(s.productoId);
        this.form.reset({
            sku: s.sku,
            productoNombre: s.productoNombre,
            reorderPoint: s.stockMinimo,
            reorderQuantity: s.suggestedReorder,
            autoCreatePo: false,
            status: 'ACTIVE'
        });
        this.statusOriginal.set('ACTIVE');
        this.bloquearCampos();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.selectedProductoIdUuid.set(null);
        this.form.reset({ reorderPoint: 0, reorderQuantity: 1, autoCreatePo: false, status: 'ACTIVE' });
        this.statusOriginal.set('ACTIVE');
        this.bloquearCampos();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(rule: ReplenishmentRule): void {
        this.editMode.set(true);
        this.selectedId.set(rule.id);
        this.selectedProductoIdUuid.set(rule.productoId);
        this.form.patchValue({ ...rule });
        this.statusOriginal.set(rule.status);
        this.bloquearCampos();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        const productoId = this.selectedProductoIdUuid();
        if (productoId === null) {
            this.submitError.set('Buscá y elegí un producto para la regla.');
            return;
        }
        this.submitting.set(true);
        // getRawValue() y NO .value: `sku` (edición) y `status` (alta) van deshabilitados
        // y .value los omitiría, mandando nulls al backend.
        const v = this.form.getRawValue();
        // `status` NO viaja acá: `CreateReplenishmentRuleRequest` no lo declara.
        // Se aplica aparte por PATCH /{id}/status (ver más abajo).
        const payload: CreateReplenishmentRuleRequest = {
            almacenId: v.almacenId ?? undefined,
            sku: v.sku,
            productoNombre: v.productoNombre || undefined,
            reorderPoint: v.reorderPoint,
            reorderQuantity: v.reorderQuantity,
            preferredSupplierName: v.preferredSupplierName || undefined,
            maxUnitCost: v.maxUnitCost ?? undefined,
            autoCreatePo: v.autoCreatePo,
            productoId
        };
        const op = this.editMode()
            ? this.api.updateReplenishmentRule(this.selectedId()!, payload)
            : this.api.createReplenishmentRule(payload);
        op.subscribe({
            next: () => {
                const nuevoStatus = String(v.status ?? '');
                // El PUT ignora el estado; si el usuario lo cambió en el drawer, se aplica
                // con el MISMO endpoint que las acciones "Pausar"/"Reactivar" de la fila.
                if (this.editMode() && nuevoStatus && nuevoStatus !== this.statusOriginal()) {
                    this.api.cambiarStatusReplenishmentRule(this.selectedId()!, nuevoStatus).subscribe({
                        next: () => { this.submitting.set(false); this.closeDrawer(); this.loadRules(); },
                        error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
                    });
                    return;
                }
                this.submitting.set(false);
                this.closeDrawer();
                this.loadRules();
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    cambiarStatus(rule: ReplenishmentRule, status: string): void {
        this.api.cambiarStatusReplenishmentRule(rule.id, status).subscribe({
            next: () => this.loadRules(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    crearOc(rule: ReplenishmentRule): void {
        if (this.creatingPoId() !== null) return;
        this.creatingPoId.set(rule.id);
        this.api.createPoFromRule(rule.id).subscribe({
            next: (res) => {
                this.creatingPoId.set(null);
                this.info.set(`OC creada en compras (id ${res.purchaseOrderId}) para ${rule.sku}.`);
                this.loadRules();
            },
            error: (err: Error) => { this.creatingPoId.set(null); this.error.set(err.message); }
        });
    }

    eliminar(id: string): void {
        this.api.deleteReplenishmentRule(id).subscribe({
            next: () => this.loadRules(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadRules();
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
