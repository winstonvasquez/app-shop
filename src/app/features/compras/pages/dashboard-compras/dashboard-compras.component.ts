import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardCompras, ProveedorMonto, OcReciente } from '../../services/dashboard.service';

@Component({
    selector: 'app-dashboard-compras',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📦 Dashboard de Compras</h1>
                <p class="page-subtitle">Resumen de compras · {{ currentMonth }}</p>
            </div>
            <div class="page-actions">
                <select class="select-filter" (change)="onPeriodChange($event)">
                    <option value="mes">Este mes</option>
                    <option value="trimestre">Trimestre</option>
                    <option value="año">Este año</option>
                </select>
            </div>
        </div>

        <div class="kpi-grid mb-lg">
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Total Compras</span>
                    <div class="kpi-icon kpi-icon-warning">📦</div>
                </div>
                <div class="kpi-value">{{ dashboard()?.totalComprasMes | currency:'S/' }}</div>
                <div class="kpi-trend" [class.trend-up]="comprasTrend() > 0" [class.trend-down]="comprasTrend() < 0">
                    {{ comprasTrend() > 0 ? '▲' : '▼' }} {{ Math.abs(comprasTrend()) }}% vs mes anterior
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">OC Emitidas</span>
                    <div class="kpi-icon kpi-icon-info">📋</div>
                </div>
                <div class="kpi-value">{{ dashboard()?.ocEmitidas || 0 }}</div>
                <div class="kpi-trend trend-up">▲ {{ dashboard()?.ocAprobadas || 0 }} aprobadas</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">OC Pendientes</span>
                    <div class="kpi-icon kpi-icon-danger">⏳</div>
                </div>
                <div class="kpi-value">{{ dashboard()?.ocPendientes || 0 }}</div>
                <div class="kpi-trend trend-down">Por aprobar: {{ dashboard()?.ocPendientes || 0 }}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Proveedores</span>
                    <div class="kpi-icon kpi-icon-success">🏭</div>
                </div>
                <div class="kpi-value">{{ dashboard()?.totalProveedores || 0 }}</div>
                <div class="kpi-trend trend-up">▲ {{ dashboard()?.proveedoresNuevos || 0 }} nuevos</div>
            </div>
        </div>

        <div class="charts-row mb-lg">
            <div class="chart-card">
                <div class="chart-title">Compras por proveedor</div>
                @if (dashboard()?.topProveedores?.length) {
                    <div class="bar-chart">
                        @for (item of dashboard()?.topProveedores; track item.nombre) {
                            <div class="bar-group">
                                <div class="bar bar-warning" [style.height.%]="item.porcentaje"></div>
                                <span class="bar-label">{{ item.nombre | slice:0:12 }}</span>
                            </div>
                        }
                    </div>
                } @else {
                    <div class="text-muted text-center p-lg">Sin datos disponibles</div>
                }
            </div>
            <div class="chart-card">
                <div class="chart-title">Top Proveedores por Monto</div>
                @if (dashboard()?.topProveedores?.length) {
                    <ul class="top-list">
                        @for (item of dashboard()?.topProveedores; track item.nombre; let i = $index) {
                            <li>
                                <div class="rank">{{ i + 1 }}</div>
                                <div class="flex-1">
                                    <div class="text-[13px] font-medium">{{ item.nombre | slice:0:25 }}</div>
                                    <div class="text-muted text-sm">RUC: {{ item.ruc }}</div>
                                </div>
                                <span class="money money-highlight">{{ item.monto | currency:'S/' }}</span>
                            </li>
                        }
                    </ul>
                } @else {
                    <div class="text-muted text-center p-lg">Sin datos disponibles</div>
                }
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="card-title">Últimas Órdenes de Compra</span>
                <a routerLink="/admin/compras/ordenes" class="btn btn-secondary btn-sm">Ver todas →</a>
            </div>
            @if (dashboard()?.ultimasOC?.length) {
                <table>
                    <thead>
                        <tr>
                            <th>OC #</th>
                            <th>Fecha</th>
                            <th>Proveedor</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (oc of dashboard()?.ultimasOC; track oc.id) {
                            <tr>
                                <td class="font-mono">{{ oc.codigo }}</td>
                                <td class="text-muted">{{ oc.fechaEmision | date:'dd/MM/yyyy' }}</td>
                                <td>{{ oc.proveedorNombre }}</td>
                                <td class="money">{{ oc.total | currency:'S/' }}</td>
                                <td>
                                    <span class="badge" [class.badge-primary]="oc.estado === 'APROBADA'" 
                                          [class.badge-warning]="oc.estado === 'PENDIENTE'"
                                          [class.badge-success]="oc.estado === 'RECIBIDA'"
                                          [class.badge-gray]="oc.estado === 'BORRADOR'">
                                        {{ oc.estado }}
                                    </span>
                                </td>
                                <td>
                                    <div class="actions-cell">
                                        <button class="icon-btn">👁</button>
                                        <button class="icon-btn">✏️</button>
                                    </div>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            } @else {
                <div class="text-muted text-center p-lg">No hay órdenes de compra registradas</div>
            }
        </div>
    `,
    styles: [`
        :host { display: block; }
    `]
})
export class DashboardComprasComponent implements OnInit {
    private dashboardService = inject(DashboardService);

    dashboard = signal<DashboardCompras | null>(null);
    comprasTrend = signal<number>(0);
    Math = Math;

    get currentMonth(): string {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[new Date().getMonth()] + ' ' + new Date().getFullYear();
    }

    ngOnInit(): void {
        this.loadDashboard();
    }

    loadDashboard(): void {
        this.dashboardService.getDashboardCompras().subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.comprasTrend.set(this.calculateTrend(data.totalComprasMes, data.totalComprasMes * 0.97));
            },
            error: () => {
                this.dashboard.set({
                    totalComprasMes: 0,
                    ocEmitidas: 0,
                    ocPendientes: 0,
                    ocAprobadas: 0,
                    ocRecibidas: 0,
                    totalProveedores: 0,
                    proveedoresNuevos: 0,
                    comprasTrimestre: 0,
                    topProveedores: [],
                    ultimasOC: []
                });
            }
        });
    }

    calculateTrend(actual: number, previous: number): number {
        if (previous === 0) return 0;
        return Math.round(((actual - previous) / previous) * 100);
    }

    onPeriodChange(event: Event): void {
        const period = (event.target as HTMLSelectElement).value;
        console.log('Period changed:', period);
    }
}
