import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';
import { ExportService } from '../../../../shared/services/export.service';

interface KpiVentas   { totalVentas: number; montoTotal: number; ticketPromedio: number; }
interface KpiCompras  { totalOrdenes: number; montoTotal: number; ordenesAprobadas: number; }
interface KpiRrhh     { empleadosActivos: number; planillasGeneradas: number; }
interface KpiTesoreria { cajasAbiertas: number; saldoTotal: number; movimientosHoy: number; }
interface KpiInventario { productosConStock: number; productosStockBajo: number; }
interface ProductoTop { sku: string; nombre: string; totalVendido: number; cantidadVendida: number; }
interface TendenciaMes { periodo: string; mes: number; anno: number; montoTotal: number; totalVentas: number; }

interface DashboardEjecutivo {
    periodo: string;
    generadoEn: string;
    ventas:    KpiVentas;
    compras:   KpiCompras;
    rrhh:      KpiRrhh;
    tesoreria: KpiTesoreria;
    inventario: KpiInventario;
}

@Component({
    selector: 'app-reportes-ejecutivo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ButtonComponent],
    templateUrl: './reportes-ejecutivo.component.html',
    styleUrls: ['./reportes-ejecutivo.component.scss'],
})
export class ReportesEjecutivoComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly exportService = inject(ExportService);
    private readonly analyticsBase = `${environment.apiUrls.analytics}/api/analytics`;
    readonly Math = Math;

    dashboard     = signal<DashboardEjecutivo | null>(null);
    topProductos  = signal<ProductoTop[]>([]);
    tendencias    = signal<TendenciaMes[]>([]);
    tendenciaMax  = signal<number>(0);
    cargando      = signal(false);
    error         = signal<string | null>(null);

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);

        this.http.get<DashboardEjecutivo>(`${this.analyticsBase}/dashboard`).subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('microshoprepoanalitica no disponible');
                this.cargando.set(false);
                this.dashboard.set({
                    periodo: new Date().toISOString().substring(0, 7),
                    generadoEn: new Date().toISOString().substring(0, 10),
                    ventas:    { totalVentas: 0, montoTotal: 0, ticketPromedio: 0 },
                    compras:   { totalOrdenes: 0, montoTotal: 0, ordenesAprobadas: 0 },
                    rrhh:      { empleadosActivos: 0, planillasGeneradas: 0 },
                    tesoreria: { cajasAbiertas: 0, saldoTotal: 0, movimientosHoy: 0 },
                    inventario: { productosConStock: 0, productosStockBajo: 0 }
                });
            }
        });

        this.http.get<ProductoTop[]>(`${this.analyticsBase}/productos/top?limit=5`).subscribe({
            next: (data) => this.topProductos.set(data),
            error: () => this.topProductos.set([])
        });

        this.http.get<TendenciaMes[]>(`${this.analyticsBase}/ventas/tendencias?meses=6`).subscribe({
            next: (data) => {
                this.tendencias.set(data);
                const max = data.reduce((m, t) => Math.max(m, t.montoTotal), 0);
                this.tendenciaMax.set(max);
            },
            error: () => this.tendencias.set([])
        });
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        const d = this.dashboard();
        if (!d) return;
        const cabecera = ['Modulo', 'Metrica', 'Valor'];
        const filas: string[][] = [
            ['Ventas', 'Total transacciones', String(d.ventas.totalVentas)],
            ['Ventas', 'Monto total (S/)', String(d.ventas.montoTotal)],
            ['Ventas', 'Ticket promedio (S/)', String(d.ventas.ticketPromedio)],
            ['Compras', 'Total ordenes', String(d.compras.totalOrdenes)],
            ['Compras', 'Monto total (S/)', String(d.compras.montoTotal)],
            ['Compras', 'Ordenes aprobadas', String(d.compras.ordenesAprobadas)],
            ['RRHH', 'Empleados activos', String(d.rrhh.empleadosActivos)],
            ['RRHH', 'Planillas generadas', String(d.rrhh.planillasGeneradas)],
            ['Tesoreria', 'Cajas abiertas', String(d.tesoreria.cajasAbiertas)],
            ['Tesoreria', 'Saldo total (S/)', String(d.tesoreria.saldoTotal)],
            ['Tesoreria', 'Movimientos hoy', String(d.tesoreria.movimientosHoy)],
            ['Inventario', 'Productos con stock', String(d.inventario.productosConStock)],
            ['Inventario', 'Productos stock bajo', String(d.inventario.productosStockBajo)],
        ];
        this.exportService.exportCsv([cabecera, ...filas], `dashboard-ejecutivo-${new Date().toISOString().substring(0, 10)}`);
    }

    exportarExcel(): void {
        const d = this.dashboard();
        if (!d) return;
        const cabecera = ['Modulo', 'Metrica', 'Valor'];
        const filas: string[][] = [
            ['Ventas', 'Total transacciones', String(d.ventas.totalVentas)],
            ['Ventas', 'Monto total (S/)', String(d.ventas.montoTotal)],
            ['Ventas', 'Ticket promedio (S/)', String(d.ventas.ticketPromedio)],
            ['Compras', 'Total ordenes', String(d.compras.totalOrdenes)],
            ['Compras', 'Monto total (S/)', String(d.compras.montoTotal)],
            ['Compras', 'Ordenes aprobadas', String(d.compras.ordenesAprobadas)],
            ['RRHH', 'Empleados activos', String(d.rrhh.empleadosActivos)],
            ['RRHH', 'Planillas generadas', String(d.rrhh.planillasGeneradas)],
            ['Tesoreria', 'Cajas abiertas', String(d.tesoreria.cajasAbiertas)],
            ['Tesoreria', 'Saldo total (S/)', String(d.tesoreria.saldoTotal)],
            ['Tesoreria', 'Movimientos hoy', String(d.tesoreria.movimientosHoy)],
            ['Inventario', 'Productos con stock', String(d.inventario.productosConStock)],
            ['Inventario', 'Productos stock bajo', String(d.inventario.productosStockBajo)],
        ];
        this.exportService.exportExcel(cabecera, filas, 'reporte-ejecutivo');
    }
}
