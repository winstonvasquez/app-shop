import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuentaService } from '../../services/cuenta.service';

interface CuentaPCGE {
    id?: string | number;
    codigo: string;
    nombre: string;
    tipo: string;
    nivel: number;
    aceptaMovimiento: boolean;
}

type TipoFiltro = 'TODOS' | 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'GASTO' | 'INGRESO';

const PCGE_DEMO: CuentaPCGE[] = [
    { codigo: '10', nombre: 'Efectivo y Equivalentes de Efectivo', tipo: 'ACTIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '101', nombre: 'Caja', tipo: 'ACTIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '1011', nombre: 'Caja Moneda Nacional', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '1012', nombre: 'Caja Moneda Extranjera', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '104', nombre: 'Cuentas Corrientes en Instituciones Financieras', tipo: 'ACTIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '1041', nombre: 'Cuentas Corrientes Operativas', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '1042', nombre: 'Cuentas Corrientes para Fines Específicos', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '12', nombre: 'Cuentas por Cobrar Comerciales - Terceros', tipo: 'ACTIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '121', nombre: 'Facturas, Boletas y Otros Comprobantes por Cobrar', tipo: 'ACTIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '1211', nombre: 'No Emitidas', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '1212', nombre: 'Emitidas en Cartera', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '20', nombre: 'Mercaderías', tipo: 'ACTIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '201', nombre: 'Mercaderías Manufacturadas', tipo: 'ACTIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '2011', nombre: 'Mercaderías Manufacturadas', tipo: 'ACTIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '40', nombre: 'Tributos, Contraprestaciones y Aportes al Sistema', tipo: 'PASIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '401', nombre: 'Gobierno Central', tipo: 'PASIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '4011', nombre: 'Impuesto General a las Ventas', tipo: 'PASIVO', nivel: 4, aceptaMovimiento: false },
    { codigo: '40111', nombre: 'IGV - Cuenta Propia', tipo: 'PASIVO', nivel: 5, aceptaMovimiento: true },
    { codigo: '40112', nombre: 'IGV - Pagos Adelantados', tipo: 'PASIVO', nivel: 5, aceptaMovimiento: true },
    { codigo: '4017', nombre: 'Impuesto a la Renta', tipo: 'PASIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '40171', nombre: 'Renta de Tercera Categoría', tipo: 'PASIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '41', nombre: 'Remuneraciones y Participaciones por Pagar', tipo: 'PASIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '411', nombre: 'Remuneraciones por Pagar', tipo: 'PASIVO', nivel: 3, aceptaMovimiento: true },
    { codigo: '42', nombre: 'Cuentas por Pagar Comerciales - Terceros', tipo: 'PASIVO', nivel: 2, aceptaMovimiento: false },
    { codigo: '421', nombre: 'Facturas, Boletas y Otros Comprobantes por Pagar', tipo: 'PASIVO', nivel: 3, aceptaMovimiento: false },
    { codigo: '4211', nombre: 'No Emitidas', tipo: 'PASIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '4212', nombre: 'Emitidas', tipo: 'PASIVO', nivel: 4, aceptaMovimiento: true },
    { codigo: '50', nombre: 'Capital', tipo: 'PATRIMONIO', nivel: 2, aceptaMovimiento: false },
    { codigo: '501', nombre: 'Capital Social', tipo: 'PATRIMONIO', nivel: 3, aceptaMovimiento: true },
    { codigo: '59', nombre: 'Resultados Acumulados', tipo: 'PATRIMONIO', nivel: 2, aceptaMovimiento: false },
    { codigo: '591', nombre: 'Utilidades No Distribuidas', tipo: 'PATRIMONIO', nivel: 3, aceptaMovimiento: true },
    { codigo: '60', nombre: 'Compras', tipo: 'GASTO', nivel: 2, aceptaMovimiento: false },
    { codigo: '601', nombre: 'Mercaderías', tipo: 'GASTO', nivel: 3, aceptaMovimiento: true },
    { codigo: '62', nombre: 'Gastos de Personal, Directores y Gerentes', tipo: 'GASTO', nivel: 2, aceptaMovimiento: false },
    { codigo: '621', nombre: 'Remuneraciones', tipo: 'GASTO', nivel: 3, aceptaMovimiento: true },
    { codigo: '6211', nombre: 'Sueldos y Salarios', tipo: 'GASTO', nivel: 4, aceptaMovimiento: true },
    { codigo: '627', nombre: 'Seguridad y Previsión Social', tipo: 'GASTO', nivel: 3, aceptaMovimiento: false },
    { codigo: '6271', nombre: 'Régimen de Prestaciones de Salud', tipo: 'GASTO', nivel: 4, aceptaMovimiento: true },
    { codigo: '63', nombre: 'Gastos de Servicios Prestados por Terceros', tipo: 'GASTO', nivel: 2, aceptaMovimiento: false },
    { codigo: '631', nombre: 'Transporte, Correos y Gastos de Viaje', tipo: 'GASTO', nivel: 3, aceptaMovimiento: true },
    { codigo: '70', nombre: 'Ventas', tipo: 'INGRESO', nivel: 2, aceptaMovimiento: false },
    { codigo: '701', nombre: 'Mercaderías', tipo: 'INGRESO', nivel: 3, aceptaMovimiento: false },
    { codigo: '7011', nombre: 'Mercaderías Manufacturadas', tipo: 'INGRESO', nivel: 4, aceptaMovimiento: true },
    { codigo: '7012', nombre: 'Mercaderías - Relacionadas', tipo: 'INGRESO', nivel: 4, aceptaMovimiento: true },
    { codigo: '75', nombre: 'Otros Ingresos de Gestión', tipo: 'INGRESO', nivel: 2, aceptaMovimiento: false },
    { codigo: '751', nombre: 'Servicios en Beneficio del Personal', tipo: 'INGRESO', nivel: 3, aceptaMovimiento: true },
];

@Component({
    selector: 'app-plan-cuentas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Plan de Cuentas PCGE 2020</h1>
                <p class="page-subtitle">
                    Plan Contable General Empresarial · {{ cuentasFiltradas().length }} cuentas
                    @if (modoDemo()) {
                        <span class="badge badge-warning" style="margin-left: 8px">Demo</span>
                    }
                </p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary" (click)="exportarCSV()">
                    Exportar CSV
                </button>
            </div>
        </div>

        <!-- Filtros -->
        <div class="card" style="margin-bottom: var(--space-lg)">
            <div class="filters-bar">
                <div class="search-box">
                    <svg class="search-box-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        class="input-field"
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        [(ngModel)]="busqueda"
                        style="padding-left: 36px" />
                </div>
                <select class="input-field" [(ngModel)]="tipoFiltro" style="width: auto; min-width: 180px">
                    <option value="TODOS">Todos los tipos</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="PASIVO">Pasivo</option>
                    <option value="PATRIMONIO">Patrimonio</option>
                    <option value="GASTO">Gasto</option>
                    <option value="INGRESO">Ingreso</option>
                </select>
            </div>
        </div>

        <!-- Tabla -->
        @if (cargando()) {
            <div class="loading-container">
                <div class="spinner"></div>
            </div>
        } @else {
            <div class="card">
                <div class="card-body" style="padding: 0">
                    <table class="table">
                        <thead class="table-header">
                            <tr>
                                <th class="table-header-cell" style="width: 120px">Código</th>
                                <th class="table-header-cell">Nombre</th>
                                <th class="table-header-cell" style="width: 130px">Tipo</th>
                                <th class="table-header-cell" style="width: 80px; text-align: center">Nivel</th>
                                <th class="table-header-cell" style="width: 150px; text-align: center">Acepta Movimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (cuenta of cuentasFiltradas(); track cuenta.codigo) {
                                <tr class="table-row" [class.cuenta-nivel2]="cuenta.nivel === 2">
                                    <td class="table-cell" style="font-family: monospace; font-size: 0.9rem">
                                        {{ cuenta.codigo }}
                                    </td>
                                    <td class="table-cell"
                                        [style.padding-left]="indentacion(cuenta.nivel)">
                                        <span [class.font-bold]="cuenta.nivel === 2">{{ cuenta.nombre }}</span>
                                    </td>
                                    <td class="table-cell">
                                        <span [class]="badgeTipo(cuenta.tipo)">{{ cuenta.tipo }}</span>
                                    </td>
                                    <td class="table-cell" style="text-align: center">
                                        {{ cuenta.nivel }}
                                    </td>
                                    <td class="table-cell" style="text-align: center">
                                        @if (cuenta.aceptaMovimiento) {
                                            <span style="color: var(--color-success); font-size: 1.1rem">&#10003;</span>
                                        } @else {
                                            <span style="color: var(--color-text-muted)">—</span>
                                        }
                                    </td>
                                </tr>
                            }
                            @if (cuentasFiltradas().length === 0) {
                                <tr>
                                    <td colspan="5" style="padding: 48px; text-align: center; color: var(--color-text-muted)">
                                        No se encontraron cuentas con los filtros aplicados.
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        }
    `,
    styles: [`
        .cuenta-nivel2 {
            background: var(--color-surface-raised);
        }
        .cuenta-nivel2 .table-cell {
            font-weight: 700;
        }
        .font-bold {
            font-weight: 700;
        }
    `]
})
export class PlanCuentasComponent implements OnInit {
    private cuentaService = inject(CuentaService);

    cargando = signal(true);
    modoDemo = signal(false);
    cuentas = signal<CuentaPCGE[]>([]);
    busqueda = '';
    tipoFiltro: TipoFiltro = 'TODOS';

    cuentasFiltradas = computed(() => {
        const lista = this.cuentas();
        const q = this.busqueda.toLowerCase().trim();
        return lista.filter(c => {
            const coincideBusqueda = !q
                || c.codigo.toLowerCase().includes(q)
                || c.nombre.toLowerCase().includes(q);
            const coincideTipo = this.tipoFiltro === 'TODOS' || c.tipo === this.tipoFiltro;
            return coincideBusqueda && coincideTipo;
        });
    });

    ngOnInit(): void {
        this.cuentaService.listarTodas().subscribe({
            next: (lista) => {
                this.cuentas.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.cuentas.set(PCGE_DEMO);
                this.modoDemo.set(true);
                this.cargando.set(false);
            }
        });
    }

    indentacion(nivel: number): string {
        const indent = Math.max(0, nivel - 2) * 20;
        return `${indent + 16}px`;
    }

    badgeTipo(tipo: string): string {
        const map: Record<string, string> = {
            'ACTIVO': 'badge badge-success',
            'PASIVO': 'badge badge-warning',
            'PATRIMONIO': 'badge badge-accent',
            'GASTO': 'badge badge-error',
            'INGRESO': 'badge badge-neutral',
        };
        return map[tipo] ?? 'badge badge-neutral';
    }

    exportarCSV(): void {
        const filas = this.cuentasFiltradas();
        const cabecera = 'codigo,nombre,tipo,nivel,acepta_movimiento';
        const lineas = filas.map(c =>
            `"${c.codigo}","${c.nombre.replace(/"/g, '""')}","${c.tipo}",${c.nivel},${c.aceptaMovimiento}`
        );
        const csv = [cabecera, ...lineas].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plan-cuentas-pcge-2020.csv';
        link.click();
        URL.revokeObjectURL(url);
    }
}
