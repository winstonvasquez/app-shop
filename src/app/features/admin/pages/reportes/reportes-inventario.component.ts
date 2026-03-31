import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ExportService } from '../../../../shared/services/export.service';

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
    imports: [],
    templateUrl: './reportes-inventario.component.html',
    styleUrls: ['./reportes-inventario.component.scss'],
})
export class ReportesInventarioComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly exportService = inject(ExportService);

    dashboard = signal<DashboardInventario | null>(null);
    stockBajo = signal<StockItem[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

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
        const cabecera = ['Producto ID', 'Almacen ID', 'Stock Actual', 'Stock Minimo', 'Estado'];
        const filas = this.stockBajo().map(item => [
            String(item.productoId),
            String(item.almacenId),
            String(item.cantidadActual),
            String(item.stockMinimo),
            'STOCK BAJO',
        ]);
        this.exportService.exportCsv([cabecera, ...filas], `reporte-inventario-${new Date().toISOString().substring(0, 10)}`);
    }

    exportarExcel(): void {
        const cabecera = ['Producto ID', 'Almacen ID', 'Stock Actual', 'Stock Minimo', 'Estado'];
        const filas = this.stockBajo().map(item => [
            String(item.productoId),
            String(item.almacenId),
            String(item.cantidadActual),
            String(item.stockMinimo),
            'STOCK BAJO',
        ]);
        this.exportService.exportExcel(cabecera, filas, 'reporte-inventario');
    }
}
