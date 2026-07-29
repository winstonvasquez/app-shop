import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';
import { BackendExportService } from '@shared/services/backend-export.service';

// `disponible` lo envía el backend por módulo: es false cuando su llamada al microservicio
// falló. Sin este flag, un módulo caído llegaba con todas sus métricas en 0 y era
// indistinguible de un módulo que respondió "no hay nada" — que es como se descubrió que el KPI
// de Ventas llevaba semanas en cero por un 403 de s2s.
interface KpiVentas   { totalVentas: number; montoTotal: number; ticketPromedio: number; disponible: boolean; }
interface KpiCompras  { totalOrdenes: number; montoTotal: number; ordenesAprobadas: number; disponible: boolean; }
interface KpiRrhh     { empleadosActivos: number; planillasGeneradas: number; disponible: boolean; }
interface KpiTesoreria { cajasAbiertas: number; saldoTotal: number; movimientosHoy: number; disponible: boolean; }
interface KpiInventario { productosConStock: number; productosStockBajo: number; disponible: boolean; }
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
    private readonly backendExportService = inject(BackendExportService);
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
                // Antes se fabricaba aquí un dashboard COMPLETO con todo en cero. Era una segunda
                // capa de mentira apilada sobre la del backend: la plantilla pintaba las cinco
                // tarjetas con S/ 0.00 y la tabla "Estado de Módulos" con OPERATIVO en verde,
                // aunque el servicio de analítica estuviera caído por completo. Ahora se deja el
                // dashboard en null y la plantilla muestra sólo el banner de error, que es lo
                // único que se sabe.
                this.error.set('microshoprepoanalitica no disponible — no se pudo obtener ningún KPI');
                this.cargando.set(false);
                this.dashboard.set(null);
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

    /**
     * Exportación SERVER-SIDE: reutiliza el endpoint de dashboard ejecutivo de
     * microshoprepoanalitica (GET /api/analytics/dashboard/export). Sin
     * filtros adicionales — produce las mismas filas Módulo/Métrica/Valor
     * que este reporte arma hoy, con datos limpios generados en backend.
     */
    onExportarCsv(): void {
        this.backendExportService.download({
            url: `${this.analyticsBase}/dashboard/export`,
            filename: `dashboard-ejecutivo-${new Date().toISOString().substring(0, 10)}`,
        }, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download({
            url: `${this.analyticsBase}/dashboard/export`,
            filename: `dashboard-ejecutivo-${new Date().toISOString().substring(0, 10)}`,
        }, 'xlsx');
    }
}
