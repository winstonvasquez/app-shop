import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';

/**
 * Contrato REAL de `GET /reportes/kpi` (ReporteComprasQueryService.KpiResumenDto).
 * El campo de devoluciones se llama `devoluciones`, no `totalDevoluciones`: con el nombre
 * equivocado llegaba `undefined` y la tarjeta «Devoluciones» del tablero salia SIN numero.
 */
interface KpiResumen {
    totalOrdenes: number;
    totalProveedores: number;
    facturasVencidas: number;
    devoluciones: number;
    totalFacturado: number;
}

/**
 * Contrato REAL de `GET /reportes/kpi/proveedores` (ReporteComprasQueryService.ProveedorKpiDto).
 *
 * Estaba declarado como `{proveedorId, proveedorNombre, totalOrdenes, montoTotal,
 * facturasPendientes}` y de esos cinco campos el backend sólo manda `totalOrdenes`: los otros
 * cuatro llegaban `undefined`. Sintomas: NG0955 en consola («claves duplicadas» — todas las filas
 * trackeaban por el mismo `undefined`), la columna Proveedor en blanco, «S/ » sin importe y la
 * insignia de facturas pendientes siempre en 0. `tsc` EXIT 0 no ve nada de esto.
 */
interface ProveedorKpi {
    id: string;
    nombre: string;
    totalOrdenes: number;
    scorePromedio: number | null;
    nivel: string | null;
}

/**
 * Contrato REAL de `GET /reportes/presupuesto` (PresupuestoDto). El identificador se llama `id`,
 * no `presupuestoId`: con el nombre equivocado el `track` del @for recibia `undefined` en todas
 * las filas y habria dado el mismo NG0955 que la tabla de proveedores en cuanto existiera un
 * presupuesto registrado (hoy la pantalla dice «Sin presupuestos», asi que no habia saltado).
 */
interface ResumenPresupuestal {
    id: string;
    categoria: string;
    montoAsignado: number;
    montoEjecutado: number;
    porcentajeEjecucion: number;
}

@Component({
    selector: 'app-reportes-kpi',
    standalone: true,
    imports: [DecimalPipe, ButtonComponent],
    templateUrl: './reportes-kpi.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesKpiComponent implements OnInit {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.purchases}/api/reportes`;

    kpi = signal<KpiResumen | null>(null);
    proveedores = signal<ProveedorKpi[]>([]);
    presupuesto = signal<ResumenPresupuestal[]>([]);
    cargando = signal(false);
    error = signal('');

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.http.get<KpiResumen>(`${this.base}/kpi`).subscribe({
            next: (d) => { this.kpi.set(d); this.cargando.set(false); },
            error: () => { this.error.set('Error al cargar KPIs'); this.cargando.set(false); }
        });
        this.http.get<ProveedorKpi[]>(`${this.base}/kpi/proveedores`).subscribe({
            next: (d) => this.proveedores.set(d),
            error: () => {}
        });
        this.http.get<ResumenPresupuestal[]>(`${this.base}/presupuesto`).subscribe({
            next: (d) => this.presupuesto.set(d),
            error: () => {}
        });
    }

    pct(exec: number, total: number): number {
        return total > 0 ? Math.min(100, Math.round((exec / total) * 100)) : 0;
    }

    pctClass(p: number): string {
        if (p >= 90) return 'badge-error';
        if (p >= 70) return 'badge-warning';
        return 'badge-success';
    }

    /** Insignia del nivel de proveedor que devuelve el backend (A/B/C o equivalente). */
    nivelProveedorClass(nivel: string): string {
        const map: Record<string, string> = {
            A: 'badge-success', ALTO: 'badge-success', EXCELENTE: 'badge-success',
            B: 'badge-warning', MEDIO: 'badge-warning', ACEPTABLE: 'badge-warning',
            C: 'badge-error', BAJO: 'badge-error', DEFICIENTE: 'badge-error',
        };
        return `badge ${map[nivel.toUpperCase()] ?? 'badge-neutral'}`;
    }
}
