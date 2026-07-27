import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryApiService, AbcAnalysis, AbcItem } from '../../services/inventory-api.service';
import { Warehouse } from '../../models/inventory.models';
import { ProductsApiService } from '@features/products/services/products-api.service';
import {
    DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';

/** Fila enriquecida para la tabla: agrega nombre resuelto y valor formateado. */
interface AbcRow extends AbcItem {
    productName: string;
    valorFmt: string;
}

@Component({
    selector: 'app-abc-analysis',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DataTableComponent, PageHeaderComponent, AlertComponent, CatalogSelectComponent],
    template: `
        <div class="page-container">
            <app-page-header
                title="Análisis ABC de Inventario"
                subtitle="Clasificación de Pareto: pocos productos (clase A) concentran la mayor parte del valor de consumo. Útil para priorizar conteos cíclicos, stock de seguridad y foco de compras."
                [breadcrumbs]="breadcrumbs">
                <div actions>
                    <label class="input-label" style="margin:0 0.5rem 0 0">Período</label>
                    <app-catalog-select tabla="PERIODO_DIAS_ANALISIS"
                        [ngModel]="dias().toString()"
                        (ngModelChange)="onDiasChange($event)">
                    </app-catalog-select>
                </div>
            </app-page-header>

            @if (error()) {
                <app-alert type="error" [message]="error()!" [dismissible]="true" (dismiss)="error.set(null)" />
            }

            <!-- Resumen por clase (línea compacta; los KPI cards viven solo en dashboards). Cubre SIEMPRE
                 el período completo (no la página actual) — no depende de los filtros de la tabla. -->
            <div class="flex flex-wrap gap-md text-sm text-subtle mb-sm">
                @for (r of resumen(); track r.clase) {
                    <span>
                        <strong class="text-on">Clase {{ r.clase }}:</strong>
                        {{ r.productos }} ítems · {{ r.valorPct }}% del valor · {{ r.productosPct }}% de ítems
                    </span>
                } @empty {
                    <span>Sin datos en el período</span>
                }
            </div>

            @if (analysis()) {
                <div class="text-subtle" style="font-size:0.8rem;margin:0.25rem 0 0.75rem">
                    {{ totalProductos() }} productos con consumo · valor total
                    <strong>S/ {{ valorTotalFmt() }}</strong> · período {{ analysis()!.periodoDias }} días
                </div>
            }

            <app-data-table
                [data]="rows()"
                [columns]="columns"
                [loading]="loading()"
                [currentPage]="currentPage()"
                [pageSize]="pageSize()"
                [totalElements]="totalElements()"
                [totalPages]="totalPages()"
                [filters]="filters"
                [dateRangeFilters]="dateRangeFilters"
                (filterChange)="onFilterChangeEvent($event)"
                (dateRangeChange)="onDateRangeChange($event)"
                (filtersClear)="onFiltersClear()"
                (pageChange)="onPageChange($event)">
            </app-data-table>
        </div>
    `
})
export class AbcAnalysisComponent {
    private readonly api = inject(InventoryApiService);
    private readonly productsApi = inject(ProductsApiService);
    readonly catalog = inject(CatalogService);

    analysis = signal<AbcAnalysis | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);
    dias = signal(365);

    /** Mapa productId → nombre, poblado aparte (el maestro de productos vive en ventas). */
    private readonly productNames = signal<Map<number, string>>(new Map());

    currentPage = signal(0);
    pageSize = signal(15);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada. La búsqueda por
    // texto NO existe: el backend no expone un parámetro `q` sobre este endpoint).
    filterClase = signal('');
    filterWarehouseId = signal('');
    filterMovementDateDesde = signal<string | null>(null);
    filterMovementDateHasta = signal<string | null>(null);

    /** Almacenes para el select de filtro del toolbar. */
    warehousesFiltro = signal<Warehouse[]>([]);

    // Filtros select del toolbar. La clase ABC sale de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'CLASE_ABC', 'clase', 'Todas las clases'),
        signalFilter('warehouseId', 'Todos los almacenes', this.warehousesFiltro,
            w => ({ value: w.id, label: w.name }))
    ];

    /** Rango de fecha explícito del período de análisis (tiene prioridad sobre "dias" si se usa). */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'movementDate', label: 'Período de análisis' }
    ];

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio', url: '/admin/dashboard' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Análisis ABC' }
    ];

    readonly resumen = computed(() => this.analysis()?.resumen ?? []);
    readonly items = computed(() => this.analysis()?.items.content ?? []);
    readonly totalProductos = computed(() => this.analysis()?.totalProductos ?? 0);
    readonly valorTotalFmt = computed(() => this.fmt(this.analysis()?.valorTotal ?? 0));

    /** Página actual enriquecida con nombre y valor formateado (reactivo a productNames). */
    readonly rows = computed<AbcRow[]>(() => {
        const names = this.productNames();
        return this.items().map(it => ({
            ...it,
            productName: names.get(it.productId) ?? `Producto #${it.productId}`,
            valorFmt: 'S/ ' + this.fmt(it.valorConsumo)
        }));
    });

    readonly columns: TableColumn<AbcRow>[] = [
        {
            key: 'clase', label: 'Clase', width: '90px', html: true,
            render: (r) => {
                const cls = r.clase === 'A' ? 'badge-success' : r.clase === 'B' ? 'badge-warning' : 'badge-neutral';
                return `<span class="badge ${cls}">${r.clase}</span>`;
            }
        },
        { key: 'productName', label: 'Producto', render: (r) => r.productName },
        { key: 'valorFmt', label: 'Valor consumo', render: (r) => r.valorFmt },
        { key: 'unidades', label: 'Unidades', render: (r) => this.fmt(r.unidades) },
        { key: 'participacionPct', label: '% del valor', render: (r) => `${r.participacionPct}%` },
        { key: 'acumuladoPct', label: '% acumulado', render: (r) => `${r.acumuladoPct}%` }
    ];

    constructor() {
        this.loadWarehousesFiltro();
        this.load();
        this.loadProductNames();
    }

    /** Almacenes para el select de filtro del toolbar. */
    private loadWarehousesFiltro(): void {
        this.api.getWarehouses().subscribe({
            next: (whs) => this.warehousesFiltro.set(whs),
            error: () => this.warehousesFiltro.set([])
        });
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.api.getAbcAnalysis({
            dias: this.dias(),
            warehouseId: this.filterWarehouseId() ? Number(this.filterWarehouseId()) : undefined,
            clase: this.filterClase() || undefined,
            movementDateDesde: this.filterMovementDateDesde() || undefined,
            movementDateHasta: this.filterMovementDateHasta() || undefined,
            page: this.currentPage(),
            size: this.pageSize()
        }).subscribe({
            next: (res) => {
                this.analysis.set(res);
                this.totalElements.set(pageTotalElements(res.items));
                this.totalPages.set(pageTotalPages(res.items));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Resuelve nombres de producto en bulk; degrada graceful si falla (queda "Producto #id"). */
    private loadProductNames(): void {
        this.productsApi.getProducts({ page: 0, size: 500 }).subscribe({
            next: (page) => {
                const map = new Map<number, string>();
                for (const p of page.content) {
                    map.set(p.id, p.nombre);
                }
                this.productNames.set(map);
            },
            error: () => this.productNames.set(new Map())
        });
    }

    onDiasChange(value: string): void {
        this.dias.set(Number(value));
        this.currentPage.set(0);
        this.load();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'clase':       this.filterClase.set(valor); break;
            case 'warehouseId': this.filterWarehouseId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.load();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'movementDate') return;
        this.filterMovementDateDesde.set(event.from);
        this.filterMovementDateHasta.set(event.to);
        this.currentPage.set(0);
        this.load();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.filterClase.set('');
        this.filterWarehouseId.set('');
        this.filterMovementDateDesde.set(null);
        this.filterMovementDateHasta.set(null);
        this.currentPage.set(0);
        this.load();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.load();
    }

    private fmt(v: number): string {
        return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
