import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface VentaPosItem {
    id: string;
    turnoId: string;
    fechaHora: string;
    tipoCpe: string;
    serie: string;
    numero: string;
    subtotal: number;
    igv: number;
    total: number;
    estado: string;
    medioPago: string;
    cajeroNombre?: string;
}

interface ResumenVentas {
    totalVentas: number;
    montoTotal: number;
    ticketPromedio: number;
}

@Component({
    selector: 'app-transacciones',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Transacciones POS</h1>
                <p class="page-subtitle">Resumen de ventas en punto de venta</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" (click)="cargar()" [disabled]="cargando()">
                    {{ cargando() ? 'Cargando...' : 'Actualizar' }}
                </button>
            </div>
        </div>

        @if (cargando()) {
            <div class="loading-container"><div class="spinner"></div></div>
        } @else {
            <!-- KPIs -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-md);margin-bottom:var(--space-lg)">
                <div class="card">
                    <div class="card-body">
                        <div class="text-sm" style="color:var(--color-text-muted)">Transacciones del período</div>
                        <div class="font-bold" style="font-size:2rem;color:var(--color-primary)">{{ resumen()?.totalVentas ?? 0 }}</div>
                        <div class="text-sm" style="color:var(--color-text-muted)">ventas registradas</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="text-sm" style="color:var(--color-text-muted)">Monto total</div>
                        <div class="font-bold" style="font-size:2rem;color:var(--color-success)">
                            S/ {{ (resumen()?.montoTotal ?? 0) | number:'1.2-2' }}
                        </div>
                        <div class="text-sm" style="color:var(--color-text-muted)">ingresos brutos</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="text-sm" style="color:var(--color-text-muted)">Ticket promedio</div>
                        <div class="font-bold" style="font-size:2rem">
                            S/ {{ (resumen()?.ticketPromedio ?? 0) | number:'1.2-2' }}
                        </div>
                        <div class="text-sm" style="color:var(--color-text-muted)">por transacción</div>
                    </div>
                </div>
            </div>

            <!-- Info card -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Historial detallado de transacciones</h3>
                </div>
                <div class="card-body">
                    <p style="color:var(--color-text-muted);margin-bottom:var(--space-md)">
                        El historial completo por turno de caja está disponible en el módulo POS.
                        Los KPIs consolidados provienen del servicio de analítica.
                    </p>
                    @if (error()) {
                        <div style="border-left:3px solid var(--color-warning);padding:var(--space-md);margin-bottom:var(--space-md)">
                            <span style="color:var(--color-text-muted);font-size:0.875rem">
                                Servicio de analítica no disponible — mostrando datos en 0.
                            </span>
                        </div>
                    }
                    <div style="display:flex;gap:var(--space-md)">
                        <a href="/admin/pos" class="btn btn-secondary">Ir al POS</a>
                        <a href="/admin/ventas" class="btn btn-secondary">Ver módulo Ventas</a>
                    </div>
                </div>
            </div>
        }
    `
})
export class TransaccionesComponent implements OnInit {
    private http = inject(HttpClient);

    resumen = signal<ResumenVentas | null>(null);
    cargando = signal(false);
    error = signal<string | null>(null);

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        this.http.get<ResumenVentas>(`${environment.apiUrls.analytics}/api/analytics/ventas`).subscribe({
            next: (data) => { this.resumen.set(data); this.cargando.set(false); },
            error: () => {
                this.error.set('Analytics no disponible');
                this.resumen.set({ totalVentas: 0, montoTotal: 0, ticketPromedio: 0 });
                this.cargando.set(false);
            }
        });
    }
}
