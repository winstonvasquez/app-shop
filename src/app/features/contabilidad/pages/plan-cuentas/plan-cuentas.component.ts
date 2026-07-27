import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CuentaService } from '../../services/cuenta.service';
import { CatalogService } from '@core/services/catalog.service';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

interface CuentaPCGE {
    id?: string | number;
    codigo: string;
    nombre: string;
    tipo: string;
    nivel: number;
    aceptaMovimiento: boolean;
}

type TipoFiltro = 'TODOS' | string;

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
    { codigo: '60', nombre: 'Compras', tipo: 'RESULTADO', nivel: 2, aceptaMovimiento: false },
    { codigo: '601', nombre: 'Mercaderías', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: true },
    { codigo: '62', nombre: 'Gastos de Personal, Directores y Gerentes', tipo: 'RESULTADO', nivel: 2, aceptaMovimiento: false },
    { codigo: '621', nombre: 'Remuneraciones', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: true },
    { codigo: '6211', nombre: 'Sueldos y Salarios', tipo: 'RESULTADO', nivel: 4, aceptaMovimiento: true },
    { codigo: '627', nombre: 'Seguridad y Previsión Social', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: false },
    { codigo: '6271', nombre: 'Régimen de Prestaciones de Salud', tipo: 'RESULTADO', nivel: 4, aceptaMovimiento: true },
    { codigo: '63', nombre: 'Gastos de Servicios Prestados por Terceros', tipo: 'RESULTADO', nivel: 2, aceptaMovimiento: false },
    { codigo: '631', nombre: 'Transporte, Correos y Gastos de Viaje', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: true },
    { codigo: '70', nombre: 'Ventas', tipo: 'RESULTADO', nivel: 2, aceptaMovimiento: false },
    { codigo: '701', nombre: 'Mercaderías', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: false },
    { codigo: '7011', nombre: 'Mercaderías Manufacturadas', tipo: 'RESULTADO', nivel: 4, aceptaMovimiento: true },
    { codigo: '7012', nombre: 'Mercaderías - Relacionadas', tipo: 'RESULTADO', nivel: 4, aceptaMovimiento: true },
    { codigo: '75', nombre: 'Otros Ingresos de Gestión', tipo: 'RESULTADO', nivel: 2, aceptaMovimiento: false },
    { codigo: '751', nombre: 'Servicios en Beneficio del Personal', tipo: 'RESULTADO', nivel: 3, aceptaMovimiento: true },
];

@Component({
    selector: 'app-plan-cuentas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DataTableComponent],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Plan de Cuentas PCGE 2020</h1>
                <p class="page-subtitle">
                    Plan Contable General Empresarial · {{ totalElementsServer() }} cuentas
                    @if (modoDemo()) {
                        <span class="badge badge-warning" style="margin-left: 8px">Demo</span>
                    }
                </p>
            </div>
        </div>

        <app-data-table
            [data]="cuentas()"
            [columns]="columns"
            [loading]="cargando()"
            [searchable]="true"
            searchPlaceholder="Buscar por código o nombre..."
            [filters]="filters"
            [exportable]="true"
            exportFileName="plan-cuentas"
            [exportConfig]="exportConfig"
            [currentPage]="currentPage()"
            [pageSize]="pageSize()"
            [totalElements]="totalElementsServer()"
            [totalPages]="totalPagesServer()"
            (searchChange)="onBusquedaChange($event)"
            (filterChange)="onFilterChangeEvent($event)"
            (filtersClear)="onFiltersClear()"
            (pageChange)="onPageChange($event)">
        </app-data-table>
    `,
})
export class PlanCuentasComponent implements OnInit {
    private cuentaService = inject(CuentaService);
    private readonly catalog = inject(CatalogService);

    readonly cargando = signal(true);
    readonly modoDemo = signal(false);
    readonly cuentas = signal<CuentaPCGE[]>([]);
    readonly busqueda = signal('');
    readonly tipoFiltro = signal<TipoFiltro>('TODOS');
    readonly filterEstado = signal('');
    readonly filterNivel = signal('');
    readonly filterAceptaMovimiento = signal('');
    readonly filterEsAnalitica = signal('');
    readonly totalElementsServer = signal(0);
    readonly totalPagesServer = signal(1);

    // Filtros del toolbar del data-table, TODOS server-side (backend: GET /cuentas, ronda 2026-07-27).
    readonly filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'TIPO_CUENTA_PCGE', 'tipo', 'Todos los tipos'),
        catalogFilter(this.catalog, 'ESTADO_ACTIVO_INACTIVO', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'NIVEL_CUENTA_PCGE', 'nivel', 'Nivel PCGE'),
        staticFilter('aceptaMovimiento', 'Acepta movimiento', [
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
        ]),
        staticFilter('esAnalitica', 'Es analítica', [
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
        ]),
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los mismos filtros actuales). Ver
     * /finance/api/v1/contabilidad/cuentas/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/cuentas/export`,
        filename: 'plan-cuentas',
        params: () => ({
            busqueda: this.busqueda(),
            tipo: this.tipoFiltro() !== 'TODOS' ? this.tipoFiltro() : undefined,
            estado: this.filterEstado() || undefined,
            nivel: this.filterNivel() || undefined,
            aceptaMovimiento: this.filterAceptaMovimiento() || undefined,
            esAnalitica: this.filterEsAnalitica() || undefined,
        }),
    };

    // Paginación (server-side)
    readonly currentPage = signal(0);
    readonly pageSize = signal(20);

    columns: TableColumn<CuentaPCGE>[] = [
        {
            key: 'codigo', label: 'Código', width: '120px',
            html: true, render: (r) => `<span class="font-mono text-sm">${r.codigo}</span>`
        },
        {
            key: 'nombre', label: 'Nombre', html: true,
            render: (r) => {
                const bold = r.nivel === 2 ? ' font-bold' : '';
                return `<span style="padding-left: ${this.indentacion(r.nivel)}; display: inline-block"`
                    + ` class="${bold.trim()}">${r.nombre}</span>`;
            }
        },
        {
            key: 'tipo', label: 'Tipo', width: '130px',
            html: true, render: (r) => `<span class="${this.badgeTipo(r.tipo)}">${this.catalog.label('TIPO_CUENTA_PCGE', r.tipo)}</span>`
        },
        { key: 'nivel', label: 'Nivel', align: 'center', width: '80px' },
        {
            key: 'aceptaMovimiento', label: 'Acepta Movimiento', align: 'center', width: '150px',
            html: true,
            render: (r) => r.aceptaMovimiento
                ? `<span style="color: var(--color-success); font-size: 1.1rem">&#10003;</span>`
                : `<span class="text-[var(--color-text-muted)]">—</span>`
        },
    ];

    ngOnInit(): void {
        this.cargarCuentas();
    }

    /** Recarga desde el backend paginado (GET /cuentas), con los filtros server-side activos. */
    private cargarCuentas(): void {
        this.cargando.set(true);
        this.cuentaService.listarPaginado({
            page: this.currentPage(),
            size: this.pageSize(),
            busqueda: this.busqueda() || undefined,
            tipo: this.tipoFiltro() !== 'TODOS' ? this.tipoFiltro() : undefined,
            estado: this.filterEstado() || undefined,
            nivel: this.filterNivel() ? Number(this.filterNivel()) : undefined,
            aceptaMovimiento: this.filterAceptaMovimiento() ? this.filterAceptaMovimiento() === 'true' : undefined,
            esAnalitica: this.filterEsAnalitica() ? this.filterEsAnalitica() === 'true' : undefined,
        }).subscribe({
            next: (page) => {
                this.cuentas.set(page.content);
                this.totalElementsServer.set(pageTotalElements(page));
                this.totalPagesServer.set(pageTotalPages(page) || 1);
                this.modoDemo.set(false);
                this.cargando.set(false);
            },
            error: () => {
                // Fallback offline: PCGE_DEMO no se filtra server-side (no hay backend disponible).
                this.cuentas.set(PCGE_DEMO);
                this.totalElementsServer.set(PCGE_DEMO.length);
                this.totalPagesServer.set(1);
                this.modoDemo.set(true);
                this.cargando.set(false);
            }
        });
    }

    onBusquedaChange(value: string): void {
        this.busqueda.set(value);
        this.currentPage.set(0);
        this.cargarCuentas();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'tipo':              this.tipoFiltro.set((valor || 'TODOS') as TipoFiltro); break;
            case 'estado':            this.filterEstado.set(valor); break;
            case 'nivel':             this.filterNivel.set(valor); break;
            case 'aceptaMovimiento':  this.filterAceptaMovimiento.set(valor); break;
            case 'esAnalitica':       this.filterEsAnalitica.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarCuentas();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.busqueda.set('');
        this.tipoFiltro.set('TODOS');
        this.filterEstado.set('');
        this.filterNivel.set('');
        this.filterAceptaMovimiento.set('');
        this.filterEsAnalitica.set('');
        this.currentPage.set(0);
        this.cargarCuentas();
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargarCuentas();
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
            'RESULTADO': 'badge badge-error',
            'ANALITICA': 'badge badge-neutral',
        };
        return map[tipo] ?? 'badge badge-neutral';
    }
}
