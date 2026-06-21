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

            <!-- Resumen por clase -->
            <div class="kpi-grid kpi-grid-3">
                @for (r of resumen(); track r.clase) {
                    <div class="kpi-card"
                        [class.kpi-card-green]="r.clase === 'A'"
                        [class.kpi-card-yellow]="r.clase === 'B'"
                        [class.kpi-card-teal]="r.clase === 'C'">
                        <div class="kpi-top">
                            <span class="kpi-label">Clase {{ r.clase }}</span>
                            <div class="kpi-icon"
                                [class.kpi-icon-green]="r.clase === 'A'"
                                [class.kpi-icon-yellow]="r.clase === 'B'"
                                [class.kpi-icon-blue]="r.clase === 'C'">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="kpi-value">{{ r.productos }}</div>
                        <div class="kpi-sub">{{ r.valorPct }}% del valor · {{ r.productosPct }}% de ítems</div>
                    </div>
                } @empty {
                    <div class="kpi-card"><div class="kpi-sub">Sin datos en el período</div></div>
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
