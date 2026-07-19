import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { InventoryApiService, AbcAnalysis, AbcItem } from '../../services/inventory-api.service';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

/** Fila enriquecida para la tabla: agrega nombre resuelto y valor formateado. */
interface AbcRow extends AbcItem {
    productName: string;
    valorFmt: string;
}

@Component({
    selector: 'app-abc-analysis',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DataTableComponent, PageHeaderComponent, AlertComponent],
    template: `
        <div class="page-container">
            <app-page-header
                title="Análisis ABC de Inventario"
                subtitle="Clasificación de Pareto: pocos productos (clase A) concentran la mayor parte del valor de consumo. Útil para priorizar conteos cíclicos, stock de seguridad y foco de compras."
                [breadcrumbs]="breadcrumbs">
                <div actions>
                    <label class="input-label" style="margin:0 0.5rem 0 0">Período</label>
                    <select class="form-input" style="min-width:160px" (change)="onDiasChange($event)">
                        <option value="90"  [selected]="dias() === 90">Últimos 90 días</option>
                        <option value="180" [selected]="dias() === 180">Últimos 180 días</option>
                        <option value="365" [selected]="dias() === 365">Últimos 365 días</option>
                    </select>
                </div>
            </app-page-header>

            @if (error()) {
                <app-alert type="error" [message]="error()!" [dismissible]="true" (dismiss)="error.set(null)" />
            }

            <!-- Resumen por clase (línea compacta; los KPI cards viven solo en dashboards) -->
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

            @if (!loading() && items().length === 0) {
                <app-alert type="info"
                    message="No hay movimientos de demanda (ventas o consumo) en el período seleccionado. Probá ampliar el rango." />
            } @else {
                <app-data-table
                    [data]="pagedItems()"
                    [columns]="columns"
                    [loading]="loading()"
                    [currentPage]="currentPage()"
                    [pageSize]="pageSize()"
                    [totalElements]="items().length"
                    [totalPages]="totalPages()"
                    (pageChange)="onPageChange($event)">
                </app-data-table>
            }
        </div>
    `
})
export class AbcAnalysisComponent {
    private readonly api = inject(InventoryApiService);
    private readonly productsApi = inject(ProductsApiService);

    analysis = signal<AbcAnalysis | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);
    dias = signal(365);

    /** Mapa productId → nombre, poblado aparte (el maestro de productos vive en ventas). */
    private readonly productNames = signal<Map<number, string>>(new Map());

    currentPage = signal(0);
    pageSize = signal(15);

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio', url: '/admin/dashboard' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Análisis ABC' }
    ];

    readonly resumen = computed(() => this.analysis()?.resumen ?? []);
    readonly items = computed(() => this.analysis()?.items ?? []);
    readonly totalProductos = computed(() => this.analysis()?.totalProductos ?? 0);
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.items().length / this.pageSize())));
    readonly valorTotalFmt = computed(() => this.fmt(this.analysis()?.valorTotal ?? 0));

    /** Slice de la página actual, enriquecido con nombre y valor formateado (reactivo a productNames). */
    readonly pagedItems = computed<AbcRow[]>(() => {
        const names = this.productNames();
        const start = this.currentPage() * this.pageSize();
        return this.items().slice(start, start + this.pageSize()).map(it => ({
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
        this.load();
        this.loadProductNames();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.currentPage.set(0);
        this.api.getAbcAnalysis(this.dias()).subscribe({
            next: (res) => { this.analysis.set(res); this.loading.set(false); },
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

    onDiasChange(event: Event): void {
        this.dias.set(Number((event.target as HTMLSelectElement).value));
        this.load();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }

    private fmt(v: number): string {
        return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}
