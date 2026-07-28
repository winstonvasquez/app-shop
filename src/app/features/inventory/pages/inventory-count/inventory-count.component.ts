import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
    FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormArray, FormControl
} from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryCount, InventoryCountDetail, InventoryCountRequest, InventoryCountStatus, Warehouse } from '../../models/inventory.models';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { ROUTES } from '@shared/constants/app.constants';
import { CatalogService } from '@core/services/catalog.service';
import { warehouseSelectSource } from '../../components/select-sources';

@Component({
    selector: 'app-inventory-count',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent, ServerSearchSelectComponent
    ],
    templateUrl: './inventory-count.component.html',
    styleUrl: './inventory-count.component.scss'
})
export class InventoryCountComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    readonly warehouseSource = warehouseSelectSource(this.api);

    counts = signal<InventoryCount[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);
    applyingId = signal<number | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterStatus = signal('');
    filterWarehouseId = signal('');
    filterCountDateDesde = signal<string | null>(null);
    filterCountDateHasta = signal<string | null>(null);
    filterAdjustedDateDesde = signal<string | null>(null);
    filterAdjustedDateHasta = signal<string | null>(null);
    searchQuery = signal('');

    /** Almacenes para el select de filtro del toolbar. */
    warehousesFiltro = signal<Warehouse[]>([]);

    // Filtros select del toolbar. Las opciones de estado salen de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_CONTEO_INVENTARIO', 'status', 'Estado'),
        signalFilter('warehouseId', 'Almacén', this.warehousesFiltro,
            w => ({ value: w.id, label: w.name }))
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'countDate', label: 'Fecha de conteo' },
        { field: 'adjustedDate', label: 'Fecha de ajuste' }
    ];

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showDetailDrawer = signal(false);
    detailTarget = signal<InventoryCount | null>(null);

    detailColumns: TableColumn<InventoryCountDetail>[] = [
        { key: 'productId', label: 'Producto', render: (r) => `#${r.productId}` },
        { key: 'systemQuantity', label: 'Cant. Sistema', align: 'right',
          render: (r) => r.systemQuantity.toLocaleString('es-PE') },
        { key: 'countedQuantity', label: 'Cant. Contada', align: 'right',
          render: (r) => r.countedQuantity.toLocaleString('es-PE') },
        {
            key: 'difference', label: 'Diferencia', align: 'right', html: true,
            render: (r) => {
                const cls = r.difference === 0 ? 'badge-neutral' : r.difference > 0 ? 'badge-success' : 'badge-error';
                return `<span class="badge ${cls}">${r.difference > 0 ? '+' : ''}${r.difference}</span>`;
            }
        },
        // Columna "Lote/Serie" RETIRADA (2026-07-28): el conteo desde esta pantalla nunca manda
        // lotId ni serialNumberId, así que siempre pintaba "—". Y no basta con añadir el selector:
        // el `systemQuantity` contra el que se compara sale de `getOrCreateStock(almacén, producto)`,
        // que es nivel ALMACÉN. Contar un solo lote daría `difference = contado_del_lote −
        // total_del_almacén`, y `applyAdjustments` convertiría esa resta en una SALIDA_AJUSTE que
        // arrasa el stock de los demás lotes — el mismo motivo por el que se quitó el selector de
        // ubicación. Contar por lote exige antes stock a nivel de lote. El backend sigue
        // resolviendo `lotId` (`resolveLot`) para quien cree conteos por API con esa semántica.
        { key: 'notes', label: 'Notas', render: (r) => r.notes ?? '—' },
        {
            key: 'adjusted', label: 'Ajustado', html: true,
            render: (r) => r.adjusted
                ? '<span class="badge badge-success">Sí</span>'
                : '<span class="badge badge-neutral">No</span>'
        }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Inventarios Físicos' }
    ];

    columns: TableColumn<InventoryCount>[] = [
        { key: 'countNumber', label: 'N°', width: '130px',
          render: (r) => r.countNumber ?? String(r.id) },
        { key: 'warehouseName', label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
        { key: 'countDate', label: 'Fecha', sortable: true,
          render: (r) => r.countDate ? new Date(r.countDate).toLocaleDateString('es-PE') : '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<InventoryCountStatus, string> = {
                    EN_PROCESO: 'badge-warning',
                    CERRADO:    'badge-neutral',
                    AJUSTADO:   'badge-success'
                };
                return `<span class="badge ${cls[r.status]}">${this.catalog.label('ESTADO_CONTEO_INVENTARIO', r.status)}</span>`;
            }
        }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /api/inventory/counts/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/counts/export`,
        filename: 'inventarios-fisicos',
        params: () => ({
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            warehouseId: this.filterWarehouseId() || undefined,
            countDateDesde: this.filterCountDateDesde() ?? undefined,
            countDateHasta: this.filterCountDateHasta() ?? undefined,
            adjustedDateDesde: this.filterAdjustedDateDesde() ?? undefined,
            adjustedDateHasta: this.filterAdjustedDateHasta() ?? undefined
        })
    };

    actions: TableAction<InventoryCount>[] = [
        {
            label: 'Ver detalle',
            class: 'btn btn-secondary',
            onClick: (r) => this.openDetail(r)
        },
        {
            label: 'Cerrar',
            class: 'btn btn-secondary',
            show: (r) => r.status === 'EN_PROCESO',
            onClick: (r) => this.onCloseCount(r.id)
        },
        {
            label: 'Aplicar ajustes',
            class: 'btn btn-primary',
            show: (r) => r.status === 'CERRADO',
            onClick: (r) => this.onApplyAdjustments(r.id)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        warehouseId: [null as number | null, Validators.required],
        countDate:   ['', Validators.required],
        notes:       [''],
        details:     this.fb.array([this.newDetailRow()])
    });

    get details(): FormArray { return this.form.get('details') as FormArray; }

    newDetailRow(productId: number | null = null, productName = ''): FormGroup {
        return this.fb.nonNullable.group({
            productId:       [productId, Validators.required],
            productName:     [productName],
            countedQuantity: [null as number | null, [Validators.required, Validators.min(0)]],
            notes:           ['']
        });
    }

    /** Agrega una fila prellenada con el producto elegido en el buscador (evita duplicados). */
    onAddProductRow(p: ProductResponse): void {
        if (this.details.controls.some(c => Number(c.get('productId')?.value) === p.id)) return;
        this.details.push(this.newDetailRow(p.id, p.nombre));
    }

    constructor() {
        this.loadWarehousesFiltro();
        this.loadCounts();
    }

    /** Almacenes para el select de filtro del toolbar. */
    private loadWarehousesFiltro(): void {
        this.api.getWarehouses().subscribe({
            next: (whs) => this.warehousesFiltro.set(whs),
            error: () => this.warehousesFiltro.set([])
        });
    }

    loadCounts(): void {
        this.loading.set(true);
        this.api.getInventoryCounts({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            warehouseId: this.filterWarehouseId() ? Number(this.filterWarehouseId()) : undefined,
            countDateDesde: this.filterCountDateDesde() || undefined,
            countDateHasta: this.filterCountDateHasta() || undefined,
            adjustedDateDesde: this.filterAdjustedDateDesde() || undefined,
            adjustedDateHasta: this.filterAdjustedDateHasta() || undefined
        }).subscribe({
            next: (res) => {
                this.counts.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Cierra un conteo EN_PROCESO (congela como paso previo al ajuste). */
    onCloseCount(id: number): void {
        if (this.applyingId() !== null) return;
        this.applyingId.set(id);
        this.error.set(null);
        this.info.set(null);
        this.api.closeInventoryCount(id).subscribe({
            next: (c) => {
                this.applyingId.set(null);
                this.info.set(`Conteo ${c.countNumber ?? id} cerrado. Ya podés aplicar los ajustes.`);
                this.loadCounts();
            },
            error: (err: Error) => { this.applyingId.set(null); this.error.set(err.message); }
        });
    }

    /**
     * Aplica los ajustes de un conteo CERRADO: genera los movimientos de ajuste al kardex.
     * El backend valida el estado (solo CERRADO) y es idempotente.
     */
    onApplyAdjustments(id: number): void {
        if (this.applyingId() !== null) return;
        this.applyingId.set(id);
        this.error.set(null);
        this.info.set(null);
        this.api.applyCountAdjustments(id).subscribe({
            next: (c) => {
                this.applyingId.set(null);
                this.info.set(`Conteo ${c.countNumber ?? id} ajustado: el stock fue corregido según las diferencias contadas.`);
                this.loadCounts();
            },
            error: (err: Error) => { this.applyingId.set(null); this.error.set(err.message); }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadCounts();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':      this.filterStatus.set(valor); break;
            case 'warehouseId': this.filterWarehouseId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadCounts();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'countDate':
                this.filterCountDateDesde.set(event.from);
                this.filterCountDateHasta.set(event.to);
                break;
            case 'adjustedDate':
                this.filterAdjustedDateDesde.set(event.from);
                this.filterAdjustedDateHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadCounts();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterWarehouseId.set('');
        this.filterCountDateDesde.set(null);
        this.filterCountDateHasta.set(null);
        this.filterAdjustedDateDesde.set(null);
        this.filterAdjustedDateHasta.set(null);
        this.currentPage.set(0);
        this.loadCounts();
    }

    openCreate(): void {
        while (this.details.length > 0) this.details.removeAt(0);
        this.form.reset({ countDate: new Date().toISOString().split('T')[0] });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }
    removeDetail(i: number): void { this.details.removeAt(i); }

    /** El detalle línea-por-línea ya viaja en getInventoryCounts(), sin llamada HTTP nueva. */
    openDetail(count: InventoryCount): void {
        this.detailTarget.set(count);
        this.showDetailDrawer.set(true);
    }

    closeDetailDrawer(): void {
        this.showDetailDrawer.set(false);
        this.detailTarget.set(null);
    }

    onSubmit(): void {
        // Guard de doble-submit: ignora clicks re-entrantes mientras la petición está en curso
        // (además del disabled del botón vía [loading]="submitting()", defensa explícita aquí).
        if (this.submitting()) return;
        if (this.details.length === 0) { this.submitError.set('Agregá al menos un producto al conteo.'); return; }
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload: InventoryCountRequest = {
            warehouseId: Number(v.warehouseId),
            countDate:   v.countDate,
            notes:       v.notes || undefined,
            details:     v.details.map((d: { productId: number; countedQuantity: number; notes: string }) => ({
                productId:       Number(d.productId),
                countedQuantity: Number(d.countedQuantity),
                notes:           d.notes || undefined
            }))
        };
        this.api.createInventoryCount(payload).subscribe({
            next: (c) => {
                this.submitting.set(false);
                this.closeDrawer();
                this.info.set(`Conteo ${c.countNumber ?? c.id} creado en estado EN_PROCESO.`);
                this.loadCounts();
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadCounts();
    }

    getDetailCtrl(i: number, name: string): FormControl {
        return this.details.at(i).get(name) as FormControl;
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
