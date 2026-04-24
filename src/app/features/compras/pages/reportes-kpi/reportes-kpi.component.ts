import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';

interface KpiResumen {
    totalOrdenes: number;
    totalProveedores: number;
    facturasVencidas: number;
    totalDevoluciones: number;
    totalFacturado: number;
}

interface ProveedorKpi {
    proveedorId: string;
    proveedorNombre: string;
    totalOrdenes: number;
    montoTotal: number;
    facturasPendientes: number;
}

interface ResumenPresupuestal {
    presupuestoId: string;
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
}
