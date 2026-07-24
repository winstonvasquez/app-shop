import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';

interface DashboardInventario {
    totalAlmacenes: number;
    almacenesActivos: number;
    productosStockBajo: number;
    productosNecesitanReorden: number;
    movimientosHoy: number;
}

interface StockItem {
    productoId: number;
    productNombre?: string;
    almacenId: number;
    almacenNombre?: string;
    cantidadActual: number;
    stockMinimo: number;
    stockMaximo: number;
}

@Component({
    selector: 'app-reportes-inventario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent],
    templateUrl: './reportes-inventario.component.html',
    styleUrls: ['./reportes-inventario.component.scss'],
})
export class ReportesInventarioComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly backendExportService = inject(BackendExportService);

    dashboard = signal<DashboardInventario | null>(null);
    stockBajo = signal<StockItem[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    /**
     * Exportación SERVER-SIDE: reutiliza el endpoint de stock de
     * microshoplogistica (GET /inventory/api/inventory/stock/export). Sin
     * filtros retorna los mismos registros bajo stock mínimo que arma este
     * reporte (findBelowMinimum), con datos limpios generados en backend.
     */
    private readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/stock/export`,
        filename: `reporte-inventario-${new Date().toISOString().substring(0, 10)}`,
    };

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);

        const base = `${environment.apiUrls.inventory}/api`;
        this.http.get<DashboardInventario>(`${base}/dashboard/inventory`).subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.cargarStockBajo(base);
            },
            error: () => {
                this.error.set('No disponible');
                this.dashboard.set({ totalAlmacenes: 0, almacenesActivos: 0, productosStockBajo: 0, productosNecesitanReorden: 0, movimientosHoy: 0 });
                this.cargando.set(false);
            }
        });
    }

    private cargarStockBajo(base: string) {
        this.http.get<StockItem[]>(`${base}/inventory/stock/below-minimum`).subscribe({
            next: (items) => { this.stockBajo.set(items); this.cargando.set(false); },
            error: () => { this.stockBajo.set([]); this.cargando.set(false); }
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
