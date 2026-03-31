import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService } from '../../services/periodo.service';

interface DashboardData {
    ingresosMes: number;
    gastosMes: number;
    utilidadBruta: number;
    igvPorPagar: number;
    periodoActual: string;
    asientosRecientes: unknown[];
}

@Component({
    selector: 'app-dashboard-contabilidad',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">📒 Dashboard Contable</h1>
                <p class="page-subtitle">PCGE 2020 · Marco Tributario SUNAT</p>
            </div>
            <div class="page-actions">
                <select class="input-field">
                    <option>{{ periodoActual() }}</option>
                </select>
            </div>
        </div>

        <div class="kpi-grid mb-lg">
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Ingresos del mes</span>
                    <div class="kpi-icon kpi-icon-success">📈</div>
                </div>
                <div class="kpi-value">{{ formatoMonto(ingresos()) }}</div>
                <div class="kpi-trend trend-up">▲ 12.4% vs feb.</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Gastos del mes</span>
                    <div class="kpi-icon kpi-icon-danger">📉</div>
                </div>
                <div class="kpi-value">{{ formatoMonto(gastos()) }}</div>
                <div class="kpi-trend trend-down">▼ 3.1% vs feb.</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">Utilidad bruta</span>
                    <div class="kpi-icon kpi-icon-primary">💹</div>
                </div>
                <div class="kpi-value">{{ formatoMonto(utilidad()) }}</div>
                <div class="kpi-trend trend-up">▲ Margen {{ margen() }}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-top">
                    <span class="kpi-label">IGV por pagar</span>
                    <div class="kpi-icon kpi-icon-danger">🏛️</div>
                </div>
                <div class="kpi-value">{{ formatoMonto(igv()) }}</div>
                <div class="kpi-trend trend-neutral">📅 Vence 12/03/2026</div>
            </div>
        </div>

        <div class="charts-row mb-lg">
            <div class="card">
                <div class="card-title mb-md">🏛️ Posición IGV</div>
                <div class="decl-block">
                    <div class="decl-row">
                        <span>IGV Ventas (débito)</span>
                        <span class="money">{{ formatoMonto(igvDebito()) }}</span>
                    </div>
                    <div class="decl-row">
                        <span>IGV Compras (crédito)</span>
                        <span class="money text-success">{{ formatoMonto(igvCredito()) }}</span>
                    </div>
                    <div class="decl-row font-bold border-t-2 border-border pt-2">
                        <span>IGV Neto a pagar</span>
                        <span class="money">{{ formatoMonto(igv()) }}</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-title mb-md">📅 Calendario Tributario</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th class="table-header-cell">Obligación</th>
                            <th class="table-header-cell">Período</th>
                            <th class="table-header-cell text-right">Monto</th>
                            <th class="table-header-cell">Vencimiento</th>
                            <th class="table-header-cell">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="table-row">
                            <td class="table-cell">IGV (PDT 621)</td>
                            <td class="table-cell">Marzo 2026</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(igv()) }}</td>
                            <td class="table-cell text-[var(--color-warning)]">12/03/2026</td>
                            <td class="table-cell"><span class="badge badge-warning">Pendiente</span></td>
                        </tr>
                        <tr class="table-row">
                            <td class="table-cell">Renta — RMT (1.5%)</td>
                            <td class="table-cell">Marzo 2026</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(renta()) }}</td>
                            <td class="table-cell text-[var(--color-warning)]">12/03/2026</td>
                            <td class="table-cell"><span class="badge badge-warning">Pendiente</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `
})
export class DashboardContabilidadComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private periodoService = inject(PeriodoService);

    periodoActual = signal('Cargando...');
    ingresos = signal(147999);
    gastos = signal(82400);
    utilidad = signal(65599);
    igv = signal(10007);
    igvDebito = signal(22576);
    igvCredito = signal(12569);
    renta = signal(1881);

    margen = () => {
        if (this.ingresos() === 0) return 0;
        return ((this.utilidad() / this.ingresos()) * 100).toFixed(1);
    };

    formatoMonto = (monto: number): string => {
        return 'S/' + monto.toLocaleString('es-PE', { minimumFractionDigits: 2 });
    };

    ngOnInit() {
        this.cargarDatos();
    }

    private cargarDatos() {
        this.periodoService.actual().subscribe({
            next: (periodo) => this.periodoActual.set(periodo.nombre),
            error: () => this.periodoService.listar().subscribe({
                next: (lista) => {
                    const abierto = lista.find(p => p.estado === 'ABIERTO');
                    if (abierto) this.periodoActual.set(abierto.nombre);
                },
                error: () => this.periodoActual.set('Sin periodo activo')
            })
        });
    }
}
