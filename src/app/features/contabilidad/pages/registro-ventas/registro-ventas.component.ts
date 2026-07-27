import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { ExportService } from '@shared/services/export.service';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { PleService } from '../../services/ple.service';
import { CatalogService } from '@core/services/catalog.service';
import { environment } from '@env/environment';
import { ButtonComponent } from '@shared/components';
import {
    DataTableComponent, TableColumn, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { CPE_TIPO } from '@shared/constants/sunat.constants';

interface VentaPLE {
    id: string | number;
    fecha: string;
    tipoComprobante: string;
    serie: string;
    numero: string;
    rucCliente: string;
    razonSocial: string;
    baseImponible: number;
    igv: number;
    total: number;
    estado: string;
}

@Component({
    selector: 'app-registro-ventas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, DataTableComponent],
    templateUrl: './registro-ventas.component.html'
})
export class RegistroVentasComponent implements OnInit {
    private http = inject(HttpClient);
    private periodoService = inject(PeriodoService);
    private exportService = inject(ExportService);
    private backendExportService = inject(BackendExportService);
    private pleService = inject(PleService);
    readonly catalog = inject(CatalogService);

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    ventas = signal<VentaPLE[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly fechaDesde = signal<string | null>(null);
    readonly fechaHasta = signal<string | null>(null);
    readonly rucEmpresa = signal('');
    readonly descargandoPLE = signal(false);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    readonly searchQuery = signal('');
    readonly filterTipoComprobante = signal('');
    readonly filterEstadoSunat = signal('');
    readonly filterClienteTipoDoc = signal('');

    readonly currentPage = signal(0);
    readonly pageSize = signal(20);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    /** Selects del toolbar. El periodo es obligatorio para el backend (no filtro opcional). */
    filters: FilterConfig[] = [
        signalFilter('periodoId', 'Seleccionar periodo', this.periodos,
            p => ({ value: p.id, label: `${p.nombre} (${p.estado})` })),
        catalogFilter(this.catalog, 'TIPO_COMPROBANTE', 'tipoComprobante', 'Tipo de comprobante'),
        catalogFilter(this.catalog, 'ESTADO_CPE_SUNAT', 'estadoSunat', 'Estado SUNAT'),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'clienteTipoDoc', 'Doc. del cliente'),
    ];

    /** Rango de fecha de emisión del comprobante para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'voucherFechaEmision', label: 'Fecha de emisión' }
    ];

    readonly totalBase = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.baseImponible, 0)
    );
    readonly totalIgv = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.igv, 0)
    );
    readonly totalVentas = computed(() =>
        this.ventas().filter(v => v.estado !== 'ANULADO').reduce((s, v) => s + v.total, 0)
    );

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el mismo filtro de periodo que la lista).
     * Ver GET .../registro-ventas/export (microshopcontabilidad).
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/registro-ventas/export`,
        filename: 'registro-ventas',
        params: () => ({
            periodoId: this.periodoSeleccionado(),
            voucherTipo: this.filterTipoComprobante(),
            estadoSunat: this.filterEstadoSunat(),
            clienteTipoDoc: this.filterClienteTipoDoc(),
            fechaDesde: this.fechaDesde() ?? undefined,
            fechaHasta: this.fechaHasta() ?? undefined,
            q: this.searchQuery(),
        }),
    };

    columns: TableColumn<VentaPLE>[] = [
        {
            key: 'fecha', label: 'Fecha', html: true,
            render: v => `<span class="font-mono">${v.fecha ? new Date(v.fecha).toLocaleDateString('es-PE') : '-'}</span>`
        },
        {
            key: 'tipoComprobante', label: 'Tipo', html: true,
            render: v => `<span class="badge badge-neutral">${v.tipoComprobante}</span>`
        },
        { key: 'serie', label: 'Serie', html: true, render: v => `<span class="font-mono">${v.serie}</span>` },
        { key: 'numero', label: 'Número', html: true, render: v => `<span class="font-mono">${v.numero}</span>` },
        { key: 'rucCliente', label: 'RUC/DNI', html: true, render: v => `<span class="font-mono">${v.rucCliente}</span>` },
        { key: 'razonSocial', label: 'Cliente' },
        {
            key: 'baseImponible', label: 'Base Imp.', align: 'right', html: true,
            render: v => `<span class="font-mono">S/ ${(v.baseImponible ?? 0).toFixed(2)}</span>`
        },
        {
            key: 'igv', label: 'IGV', align: 'right', html: true,
            render: v => `<span class="font-mono">S/ ${(v.igv ?? 0).toFixed(2)}</span>`
        },
        {
            key: 'total', label: 'Total', align: 'right', html: true,
            render: v => `<span class="font-mono font-bold">S/ ${(v.total ?? 0).toFixed(2)}</span>`
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: v => `<span class="badge ${v.estado === 'ANULADO' ? 'badge-error' : 'badge-success'}">${v.estado}</span>`
        },
    ];

    ngOnInit() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargar();
                }
            },
            error: () => {}
        });
    }

    descargarPLE14() {
        const periodoId = this.periodoSeleccionado();
        const ruc = this.rucEmpresa();
        if (!periodoId || ruc.length !== 11) return;
        this.descargandoPLE.set(true);
        this.pleService.descargarLibro14(periodoId, ruc).subscribe({
            next: resp => {
                const blob = resp.body!;
                const cd = resp.headers.get('Content-Disposition') ?? '';
                const filename = cd.match(/filename="?([^"]+)"?/)?.[1] ?? `PLE-14-${periodoId}.txt`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                this.descargandoPLE.set(false);
            },
            error: () => this.descargandoPLE.set(false),
        });
    }

    // PLE Libro 14 — formato SUNAT pipe-delimited (generación local)
    exportarPLE() {
        const periodo = this.periodos().find(p => p.id === this.periodoSeleccionado());
        const periodoStr = periodo ? this.formatPeriodoPLE(periodo.nombre) : '20260300';
        const lines = this.ventas().map((v, i) => {
            const cuo = String(i + 1).padStart(6, '0');
            const correlativo = 'M' + String(i + 1).padStart(3, '0');
            const tipoCpe = v.tipoComprobante === 'FACTURA' ? CPE_TIPO.FACTURA : v.tipoComprobante === 'BOLETA' ? CPE_TIPO.BOLETA : '00';
            const fechaFmt = this.formatFechaPLE(v.fecha);
            const tipoDocliente = (v.rucCliente ?? '').length === 11 ? '6' : '1';
            const base = (v.baseImponible ?? 0).toFixed(2);
            const igv = (v.igv ?? 0).toFixed(2);
            const total = (v.total ?? 0).toFixed(2);
            const estado = v.estado === 'ANULADO' ? '8' : '1';
            return [periodoStr, cuo, correlativo, tipoCpe, v.serie ?? '', v.numero ?? '',
                    fechaFmt, '', tipoDocliente, v.rucCliente ?? '', v.razonSocial ?? '',
                    '0.00', base, '0.00', igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
                    total, '1.000', '', '', '', '', estado, ''].join('|');
        });
        this.exportService.descargarTxt(lines.join('\r\n'), `LE${periodoStr}140100001100_1_1`);
    }

    exportarCSV() {
        // Exportación SERVER-SIDE (mismo endpoint /export que exportConfig, formato csv).
        this.backendExportService.download(this.exportConfig, 'csv');
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'periodoId':
                this.periodoSeleccionado.set(valor);
                this.ventas.set([]);
                break;
            case 'tipoComprobante':  this.filterTipoComprobante.set(valor); break;
            case 'estadoSunat':      this.filterEstadoSunat.set(valor); break;
            case 'clienteTipoDoc':   this.filterClienteTipoDoc.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent) {
        if (event.field === 'voucherFechaEmision') {
            this.fechaDesde.set(event.from);
            this.fechaHasta.set(event.to);
            this.currentPage.set(0);
            if (this.periodoSeleccionado()) this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo (excepto el periodo) y recarga UNA sola vez. */
    onFiltersClear() {
        this.searchQuery.set('');
        this.filterTipoComprobante.set('');
        this.filterEstadoSunat.set('');
        this.filterClienteTipoDoc.set('');
        this.fechaDesde.set(null);
        this.fechaHasta.set(null);
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    cargar() {
        if (!this.periodoSeleccionado()) return;
        this.cargando.set(true);
        this.error.set(null);
        let params = new HttpParams()
            .set('periodoId', this.periodoSeleccionado())
            .set('page', this.currentPage().toString())
            .set('size', this.pageSize().toString());
        if (this.filterTipoComprobante()) params = params.set('voucherTipo', this.filterTipoComprobante());
        if (this.filterEstadoSunat()) params = params.set('estadoSunat', this.filterEstadoSunat());
        if (this.filterClienteTipoDoc()) params = params.set('clienteTipoDoc', this.filterClienteTipoDoc());
        if (this.fechaDesde()) params = params.set('fechaDesde', this.fechaDesde()!);
        if (this.fechaHasta()) params = params.set('fechaHasta', this.fechaHasta()!);
        if (this.searchQuery()) params = params.set('q', this.searchQuery());
        this.http.get<unknown>(`${environment.apiUrls.accounting}/api/v1/contabilidad/registro-ventas`, { params }).subscribe({
            next: (res) => {
                const r = res as { content?: VentaPLE[] };
                this.ventas.set(r.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el registro de ventas de este periodo');
                this.ventas.set([]);
                this.cargando.set(false);
            }
        });
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
