import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { CatalogService } from '@core/services/catalog.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { OrdenCompraService } from '../../../compras/services/orden-compra.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../../compras/services/proveedor.service';
import { PleService } from '../../services/ple.service';
import { OrdenCompra } from '../../../compras/models/orden-compra.model';
import { ExportService } from '@shared/services/export.service';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent, PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { ButtonComponent } from '@shared/components';
import { CPE_TIPO, MONEDA } from '@shared/constants/sunat.constants';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-registro-compras',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ReactiveFormsModule, DataTableComponent, ButtonComponent],
    templateUrl: './registro-compras.component.html'
})
export class RegistroComprasComponent implements OnInit {
    private periodoService = inject(PeriodoService);
    private ordenCompraService = inject(OrdenCompraService);
    private proveedorService = inject(ProveedorService);
    private exportService = inject(ExportService);
    private backendExportService = inject(BackendExportService);
    private pleService = inject(PleService);
    private fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    filterForm = this.fb.group({
        rucEmpresa: [''],
    });

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    estadoFiltro = signal<string>('');
    filterCondicionPago = signal<string>('');
    filterMoneda = signal<string>('');
    filterProveedorId = signal<string>('');
    filterFechaEmisionDesde = signal<string | null>(null);
    filterFechaEmisionHasta = signal<string | null>(null);
    searchQuery = signal<string>('');
    ordenes = signal<OrdenCompra[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly descargandoPLE = signal(false);

    // Pagination (server-side real — antes era [totalPages]=1/[pageSize]=200 hardcodeado)
    currentPage = signal(0);
    pageSize = signal<number>(200);
    totalElements = signal(0);
    totalPages = signal(0);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros del toolbar del data-table: periodo (dinámico, se traduce a fechaEmisionDesde/Hasta) + catálogo
    filtros: FilterConfig[] = [
        {
            field: 'periodo',
            label: 'Periodo',
            options: toObservable(this.periodos).pipe(
                map(list => list.map(p => ({ value: p.id, label: `${p.nombre} (${p.estado})` })))
            )
        },
        catalogFilter(this.catalog, 'ESTADO_ORDEN_COMPRA', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'CONDICION_PAGO', 'condicionPago', 'Cond. de pago'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('proveedorId', 'Proveedor', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial }))
    ];

    /** Rango de fecha de emisión para el toolbar del data-table (se sincroniza con el periodo elegido). */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaEmision', label: 'Fecha de emisión' }
    ];

    columns: TableColumn<OrdenCompra>[] = [
        { key: 'codigo', label: 'Código' },
        { key: 'fechaEmision', label: 'Fecha',
          render: (row) => row.fechaEmision
            ? new Date(row.fechaEmision).toLocaleDateString('es-PE') : '-' },
        { key: 'proveedorNombre', label: 'Proveedor',
          render: (row) => (row.proveedorNombre ?? String(row.proveedorId ?? '')) },
        { key: 'subtotal', label: 'Subtotal', align: 'right',
          render: (row) => `S/ ${(row.subtotal ?? 0).toFixed(2)}` },
        { key: 'igv', label: 'IGV', align: 'right',
          render: (row) => `S/ ${(row.igv ?? 0).toFixed(2)}` },
        { key: 'total', label: 'Total', align: 'right',
          render: (row) => `S/ ${(row.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="${this.badgeEstado(row.estado)}">${row.estado}</span>` },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el mismo filtro de estado que la lista).
     * Ver GET /api/ordenes-compra/export/registro-compras (microshopcompras).
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/ordenes-compra/export/registro-compras`,
        filename: 'registro-compras',
        params: () => ({
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            moneda: this.filterMoneda() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() ?? undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() ?? undefined
        }),
    };

    /** KPIs calculados sobre la página actualmente cargada (no sobre el periodo completo). */
    readonly ordenesActivas = computed(() => this.ordenes().filter(o => o.estado !== 'CANCELADA'));
    readonly totalBase = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.subtotal ?? 0), 0));
    readonly totalIgv = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.igv ?? 0), 0));
    readonly totalCompras = computed(() => this.ordenesActivas().reduce((s, o) => s + (o.total ?? 0), 0));

    ngOnInit() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.cambiarPeriodo(abierto.id);
                    this.cargar();
                }
            },
            error: () => {}
        });
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    /** Cambia de periodo contable y traduce sus fechas de inicio/fin al rango de emisión filtrado. */
    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        const periodo = this.periodos().find(p => p.id === id);
        this.filterFechaEmisionDesde.set(periodo?.fechaInicio ?? null);
        this.filterFechaEmisionHasta.set(periodo?.fechaFin ?? null);
        this.ordenes.set([]);
    }

    /** Maneja los selects del toolbar del data-table (periodo dinámico + catálogos). */
    onFilterChange(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'periodo':
                this.cambiarPeriodo(valor);
                break;
            case 'estado':          this.estadoFiltro.set(valor); break;
            case 'condicionPago':   this.filterCondicionPago.set(valor); break;
            case 'moneda':          this.filterMoneda.set(valor); break;
            case 'proveedorId':     this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    /** Rango de fecha de emisión: permite acotar más allá de los límites del periodo elegido. */
    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaEmision') {
            this.filterFechaEmisionDesde.set(event.from);
            this.filterFechaEmisionHasta.set(event.to);
            this.currentPage.set(0);
            if (this.periodoSeleccionado()) this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo salvo el periodo (ancla obligatoria) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.estadoFiltro.set('');
        this.filterCondicionPago.set('');
        this.filterMoneda.set('');
        this.filterProveedorId.set('');
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        this.filterFechaEmisionDesde.set(periodo?.fechaInicio ?? null);
        this.filterFechaEmisionHasta.set(periodo?.fechaFin ?? null);
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    cargar() {
        if (!this.periodoSeleccionado()) return;
        this.cargando.set(true);
        this.error.set(null);
        this.ordenCompraService.getOrdenes({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            estado: this.estadoFiltro() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            moneda: this.filterMoneda() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() || undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() || undefined
        }).subscribe({
            next: (page) => {
                this.ordenes.set(page.content ?? []);
                this.totalElements.set(pageTotalElements(page));
                this.totalPages.set(pageTotalPages(page));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las órdenes de compra');
                this.cargando.set(false);
            }
        });
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            'APROBADA': 'badge-success',
            'RECIBIDA': 'badge-accent',
            'PENDIENTE': 'badge-warning',
            'CANCELADA': 'badge-error'
        };
        return `badge ${map[estado] ?? 'badge-neutral'}`;
    }

    descargarPLE08() {
        const periodoId = this.periodoSeleccionado();
        const ruc = this.filterForm.value.rucEmpresa ?? '';
        if (!periodoId || ruc.length !== 11) return;
        this.descargandoPLE.set(true);
        this.pleService.descargarLibro08(periodoId, ruc).subscribe({
            next: resp => {
                const blob = resp.body!;
                const cd = resp.headers.get('Content-Disposition') ?? '';
                const filename = cd.match(/filename="?([^"]+)"?/)?.[1] ?? `PLE-08-${periodoId}.txt`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                this.descargandoPLE.set(false);
            },
            error: () => this.descargandoPLE.set(false),
        });
    }

    // PLE Libro 8 — formato SUNAT pipe-delimited (generación local)
    exportarPLE() {
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';
        const lines = this.ordenes().map((o, i) => {
            const cuo = String(i + 1).padStart(6, '0');
            const fechaFmt = this.formatFechaPLE(o.fechaEmision);
            const tipoCpe = CPE_TIPO.FACTURA;
            const serie = o.codigo?.split('-')[0] ?? 'F001';
            const numero = o.codigo?.split('-').slice(1).join('') ?? String(i + 1).padStart(8, '0');
            const base = (o.subtotal ?? 0).toFixed(2);
            const igv = (o.igv ?? 0).toFixed(2);
            const total = (o.total ?? 0).toFixed(2);
            const proveedor = o.proveedorNombre ?? String(o.proveedorId ?? '');
            const estado = o.estado === 'CANCELADA' ? '8' : '1';
            return [periodoStr, cuo, fechaFmt, '', tipoCpe, serie, numero,
                    '6', '', proveedor,
                    base, igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
                    total, MONEDA.PEN, '1.000', '', '', '', '0', '0.00', '0.00',
                    estado, '0', '0'].join('|');
        });
        this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}080100001100_1_1`);
    }

    exportarCSV() {
        // Exportación SERVER-SIDE (mismo endpoint /export que exportConfig, formato csv).
        this.backendExportService.download(this.exportConfig, 'csv');
    }

    private formatPeriodoPLE(nombre: string): string {
        const meses: Record<string, string> = {
            enero: '01', febrero: '02', marzo: '03', abril: '04',
            mayo: '05', junio: '06', julio: '07', agosto: '08',
            septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
        };
        const parts = nombre.toLowerCase().split(' ');
        const mes = meses[parts[0]] ?? '01';
        const anio = parts[1] ?? '2026';
        return `${anio}${mes}00`;
    }

    private formatFechaPLE(fecha: string): string {
        if (!fecha) return '';
        try {
            const d = new Date(fecha);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getFullYear()}`;
        } catch { return fecha; }
    }
}
