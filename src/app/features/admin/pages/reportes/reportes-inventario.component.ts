import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { environment } from '@env/environment';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';
import { InventoryApiService, DashboardSummary } from '@features/inventory/services/inventory-api.service';
import { InventoryStock } from '@features/inventory/models/inventory.models';
import { ProductsApiService } from '@features/products/services/products-api.service';

@Component({
    selector: 'app-reportes-inventario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent],
    templateUrl: './reportes-inventario.component.html',
    styleUrls: ['./reportes-inventario.component.scss'],
})
export class ReportesInventarioComponent implements OnInit {
    private readonly api = inject(InventoryApiService);
    private readonly productsApi = inject(ProductsApiService);
    private readonly backendExportService = inject(BackendExportService);

    /** Mapa productId → nombre (el maestro de productos vive en ventas, cross-service). */
    private readonly productNames = signal<Map<number, string>>(new Map());

    dashboard = signal<DashboardSummary | null>(null);
    stockBajo = signal<InventoryStock[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    /**
     * Exportación SERVER-SIDE: reutiliza el endpoint de stock de
     * microshoplogistica (GET /inventory/api/inventory/stock/export). Sin
     * filtros retorna los mismos registros bajo stock mínimo que arma este
     * reporte (getLowStock), con datos limpios generados en backend.
     */
    private readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/stock/export`,
        filename: `reporte-inventario-${new Date().toISOString().substring(0, 10)}`,
    };

    ngOnInit() {
        this.loadProductNames();
        this.cargar();
    }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);

        this.api.getDashboardSummary().subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.cargarStockBajo();
            },
            error: () => {
                this.error.set('No disponible');
                this.dashboard.set({
                    totalAlmacenes: 0, almacenesActivos: 0, productosStockBajo: 0,
                    productosNecesitanReorden: 0, movimientosHoy: 0, inventoryAccuracyPct: null
                });
                this.cargando.set(false);
            }
        });
    }

    productName(item: InventoryStock): string {
        return this.productNames().get(item.productId) ?? `Producto #${item.productId}`;
    }

    private cargarStockBajo() {
        this.api.getLowStock().subscribe({
            next: (items) => { this.stockBajo.set(items); this.cargando.set(false); },
            error: () => { this.stockBajo.set([]); this.cargando.set(false); }
        });
    }

    /** Resuelve nombres de producto en bulk; degrada graceful (queda "Producto #id"). */
    private loadProductNames(): void {
        this.productsApi.getProducts({ page: 0, size: 500 }).subscribe({
            next: (page) => {
                const map = new Map<number, string>();
                for (const p of page.content) { map.set(p.id, p.nombre); }
                this.productNames.set(map);
                if (this.stockBajo().length > 0) { this.stockBajo.set([...this.stockBajo()]); }
            },
            error: () => this.productNames.set(new Map())
        });
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        this.backendExportService.download(this.exportConfig, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download(this.exportConfig, 'xlsx');
    }
}
