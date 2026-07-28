import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AsientoService, LibroDiarioEntry } from '../../services/asiento.service';
import { CuentaService, CuentaContable } from '../../services/cuenta.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { CatalogService } from '@core/services/catalog.service';
import { ExportService } from '@shared/services/export.service';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';
import {
    DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-libro-diario',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent, DataTableComponent],
    templateUrl: './libro-diario.component.html'
})
export class LibroDiarioComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private cuentaService = inject(CuentaService);
    private periodoService = inject(PeriodoService);
    private exportService = inject(ExportService);
    private backendExportService = inject(BackendExportService);
    private readonly catalog = inject(CatalogService);

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    lineas = signal<LibroDiarioEntry[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    /** Cuentas PCGE para el select de filtro "Cuenta". */
    readonly cuentas = signal<CuentaContable[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    readonly filterCuenta = signal<string | null>(null);
    readonly filterTipoAsiento = signal<string | null>(null);
    readonly filterOrigen = signal<string | null>(null);
    readonly filterEstado = signal<string | null>(null);
    readonly filterFechaDesde = signal<string | null>(null);
    readonly filterFechaHasta = signal<string | null>(null);
    readonly searchQuery = signal('');

    readonly currentPage = signal(0);
    readonly pageSize = signal<number>(PAGINATION.defaultPageSize);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    // Debe/Haber/Cuadre se calculan SOLO sobre la página actual (el backend pagina
    // el libro diario desde la ronda 2026-07-27; no hay endpoint de totales agregados).
    readonly totalDebe = computed(() => this.lineas().reduce((s, l) => s + (l.debe ?? 0), 0));
    readonly totalHaber = computed(() => this.lineas().reduce((s, l) => s + (l.haber ?? 0), 0));
    readonly cuadra = computed(() => Math.abs(this.totalDebe() - this.totalHaber()) < 0.01);

    // Filtros del toolbar del data-table. periodo va incluido: es obligatorio para el
    // endpoint, así que se trata como un filtro más (igual que en asientos.component.ts).
    readonly filters: FilterConfig[] = [
        signalFilter('periodo', 'Periodo', this.periodos,
            p => ({ value: p.id, label: `${p.nombre} (${p.estado})` })),
        signalFilter('cuenta', 'Cuenta', this.cuentas,
            c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` })),
        catalogFilter(this.catalog, 'TIPO_ASIENTO_CONTABLE', 'tipoAsiento', 'Tipo de asiento'),
        catalogFilter(this.catalog, 'ORIGEN_ASIENTO_CONTABLE', 'origen', 'Origen del asiento'),
        catalogFilter(this.catalog, 'ESTADO_ASIENTO_CONTABLE', 'estado', 'Estado del asiento'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fecha', label: 'Fecha del asiento' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los mismos filtros actuales). Ver GET /api/v1/contabilidad/libro-diario/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/libro-diario/export`,
        filename: 'libro-diario',
        params: () => ({
            periodo: this.periodoSeleccionado(),
            fechaDesde: this.filterFechaDesde() ?? undefined,
            fechaHasta: this.filterFechaHasta() ?? undefined,
            cuenta: this.filterCuenta() ?? undefined,
            tipoAsiento: this.filterTipoAsiento() ?? undefined,
            origen: this.filterOrigen() ?? undefined,
            estado: this.filterEstado() ?? undefined,
            search: this.searchQuery() || undefined,
        }),
    };

    columns: TableColumn<LibroDiarioEntry>[] = [
        {
            key: 'fecha', label: 'Fecha', html: true,
            render: l => `<span class="font-mono">${l.fecha ? new Date(l.fecha).toLocaleDateString('es-PE') : '-'}</span>`
        },
        {
            key: 'codigo', label: 'N° Asiento', html: true,
            render: l => `<span class="font-mono font-bold">${l.codigo}</span>`
        },
        {
            key: 'cuentaCodigo', label: 'Cuenta', html: true,
            render: l => `<span class="font-mono font-bold">${l.cuentaCodigo}</span> <span class="text-sm" style="color:var(--color-text-muted)">${l.cuentaNombre}</span>`
        },
        { key: 'glosa', label: 'Descripción' },
        {
            key: 'debe', label: 'Debe', align: 'right', html: true,
            render: l => `<span class="font-mono">${l.debe > 0 ? 'S/ ' + l.debe.toFixed(2) : ''}</span>`
        },
        {
            key: 'haber', label: 'Haber', align: 'right', html: true,
            render: l => `<span class="font-mono">${l.haber > 0 ? 'S/ ' + l.haber.toFixed(2) : ''}</span>`
        },
    ];

    ngOnInit() {
        this.cargarPeriodos();
        this.cuentaService.listarTodas().subscribe({
            next: (lista) => this.cuentas.set(lista),
            error: () => this.cuentas.set([])
        });
    }

    private cargarPeriodos() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargarLibro();
                }
            },
            error: () => this.error.set('No se pudieron cargar los periodos')
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        this.currentPage.set(0);
        if (id) {
            this.cargarLibro();
        } else {
            this.lineas.set([]);
            this.totalElements.set(0);
            this.totalPages.set(0);
        }
    }

    /** La búsqueda por texto también va al backend (`search`), no filtra la página cargada. */
    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargarLibro();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'periodo') {
            this.cambiarPeriodo(event.value != null ? String(event.value) : '');
            return;
        }
        const valor = event.value != null ? String(event.value) : null;
        switch (event.field) {
            case 'cuenta':       this.filterCuenta.set(valor); break;
            case 'tipoAsiento':  this.filterTipoAsiento.set(valor); break;
            case 'origen':       this.filterOrigen.set(valor); break;
            case 'estado':       this.filterEstado.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarLibro();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fecha') return;
        this.filterFechaDesde.set(event.from);
        this.filterFechaHasta.set(event.to);
        this.currentPage.set(0);
        this.cargarLibro();
    }

    /**
     * "Limpiar filtros": resetea TODOS los signals, incluido el periodo (el data-table
     * también lo limpia visualmente al ser uno de los `filters`). Sin periodo el
     * endpoint no puede resolverse, así que vaciamos la lista en vez de recargar.
     */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterCuenta.set(null);
        this.filterTipoAsiento.set(null);
        this.filterOrigen.set(null);
        this.filterEstado.set(null);
        this.filterFechaDesde.set(null);
        this.filterFechaHasta.set(null);
        this.currentPage.set(0);
        this.periodoSeleccionado.set('');
        this.lineas.set([]);
        this.totalElements.set(0);
        this.totalPages.set(0);
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargarLibro();
    }

    cargarLibro() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerLibroDiario(periodoId, {
            page: this.currentPage(),
            size: this.pageSize(),
            fechaDesde: this.filterFechaDesde(),
            fechaHasta: this.filterFechaHasta(),
            cuenta: this.filterCuenta(),
            tipoAsiento: this.filterTipoAsiento(),
            origen: this.filterOrigen(),
            estado: this.filterEstado(),
            search: this.searchQuery() || null,
        }).subscribe({
            next: (page) => {
                this.lineas.set(page.content ?? []);
                this.totalElements.set(pageTotalElements(page));
                this.totalPages.set(pageTotalPages(page));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el libro diario');
                this.cargando.set(false);
            }
        });
    }

    /**
     * El PLE necesita TODAS las filas del periodo (con los filtros vigentes), no solo
     * la página visible: se pide aparte con un tamaño de página grande (mismo patrón
     * que los `/export` del backend).
     */
    exportarPLE() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        const periodo = this.periodos().find(p => p.id === periodoId);
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';

        this.asientoService.obtenerLibroDiario(periodoId, {
            page: 0,
            size: 100000,
            fechaDesde: this.filterFechaDesde(),
            fechaHasta: this.filterFechaHasta(),
            cuenta: this.filterCuenta(),
            tipoAsiento: this.filterTipoAsiento(),
            origen: this.filterOrigen(),
            estado: this.filterEstado(),
            search: this.searchQuery() || null,
        }).subscribe({
            next: (page) => {
                const lines = (page.content ?? []).map((l, i) => {
                    const cuo = String(i + 1).padStart(6, '0');
                    const fechaFmt = this.formatFechaPLE(l.fecha);
                    return [periodoStr, cuo, fechaFmt, l.codigo,
                            l.cuentaCodigo, l.glosa,
                            (l.debe ?? 0).toFixed(2), (l.haber ?? 0).toFixed(2)].join('|');
                });
                this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}030100001100_1_1`);
            },
            error: () => this.error.set('Error al generar el PLE')
        });
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
