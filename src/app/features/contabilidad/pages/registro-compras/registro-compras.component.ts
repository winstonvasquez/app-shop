import { codigoSunatDeComprobante } from '../../models/comprobante-sunat';
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CatalogService } from '@core/services/catalog.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { PleService } from '../../services/ple.service';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import {
    DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent, PaginationEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { ButtonComponent } from '@shared/components';
import { adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Fila del Registro de Compras (libro 8.1): comprobante del PROVEEDOR, tal como lo devuelve contabilidad. */
export interface RegistroCompra {
    fecha: string;
    fechaVencimiento: string | null;
    tipoComprobante: string;
    serie: string;
    numero: string;
    rucProveedor: string;
    razonSocial: string;
    baseImponible: number;
    igv: number;
    baseNoGravada: number;
    otrosCargos: number;
    total: number;
    estado: string;
}

@Component({
    selector: 'app-registro-compras',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ReactiveFormsModule, DataTableComponent, ButtonComponent],
    templateUrl: './registro-compras.component.html'
})
export class RegistroComprasComponent implements OnInit {
    private http = inject(HttpClient);
    private periodoService = inject(PeriodoService);
    private backendExportService = inject(BackendExportService);
    private pleService = inject(PleService);
    private fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    filterForm = this.fb.group({
        rucEmpresa: [''],
    });

    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    filterTipoComprobante = signal<string>('');
    filterFechaDesde = signal<string | null>(null);
    filterFechaHasta = signal<string | null>(null);
    searchQuery = signal<string>('');
    registros = signal<RegistroCompra[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    readonly descargandoPLE = signal(false);

    currentPage = signal(0);
    pageSize = signal<number>(20);
    totalElements = signal(0);
    totalPages = signal(0);

    /** El periodo es obligatorio para el backend (ancla del libro), por eso va como select del toolbar. */
    filtros: FilterConfig[] = [
        signalFilter('periodoId', 'Seleccionar periodo', this.periodos,
            p => ({ value: p.id, label: `${p.nombre} (${p.estado})` })),
        catalogFilter(this.catalog, 'TIPO_COMPROBANTE', 'tipoComprobante', 'Tipo de comprobante'),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaEmision', label: 'Fecha de emisión' }
    ];

    columns: TableColumn<RegistroCompra>[] = [
        { key: 'fecha', label: 'Fecha',
          render: (r) => r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-PE') : '-' },
        { key: 'tipoComprobante', label: 'Tipo' },
        { key: 'serie', label: 'Serie' },
        { key: 'numero', label: 'Número' },
        { key: 'rucProveedor', label: 'RUC' },
        { key: 'razonSocial', label: 'Proveedor' },
        { key: 'baseImponible', label: 'Base Imp.', align: 'right',
          render: (r) => `S/ ${(r.baseImponible ?? 0).toFixed(2)}` },
        { key: 'igv', label: 'IGV', align: 'right',
          render: (r) => `S/ ${(r.igv ?? 0).toFixed(2)}` },
        { key: 'total', label: 'Total', align: 'right',
          render: (r) => `S/ ${(r.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${r.estado === 'VIGENTE' ? 'badge-success' : 'badge-error'}">${r.estado}</span>` },
    ];

    /** Exportación SERVER-SIDE desde registro_compras (misma fuente que el PLE 8.1), con los mismos filtros. */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/registro-compras/export`,
        filename: 'registro-compras',
        params: () => ({
            periodoId: this.periodoSeleccionado(),
            voucherTipo: codigoSunatDeComprobante(this.filterTipoComprobante()),
            fechaDesde: this.filterFechaDesde() ?? undefined,
            fechaHasta: this.filterFechaHasta() ?? undefined,
            q: this.searchQuery(),
        }),
    };

    /** KPIs sobre la página cargada (no sobre el periodo completo). Los anulados no cuentan. */
    readonly vigentes = computed(() => this.registros().filter(r => r.estado !== 'ANULADO'));
    readonly totalBase = computed(() => this.vigentes().reduce((s, r) => s + (r.baseImponible ?? 0), 0));
    readonly totalIgv = computed(() => this.vigentes().reduce((s, r) => s + (r.igv ?? 0), 0));
    readonly totalCompras = computed(() => this.vigentes().reduce((s, r) => s + (r.total ?? 0), 0));

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

    onFilterChange(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'periodoId':
                this.periodoSeleccionado.set(valor);
                this.registros.set([]);
                break;
            case 'tipoComprobante': this.filterTipoComprobante.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        if (this.periodoSeleccionado()) this.cargar();
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaEmision') {
            this.filterFechaDesde.set(event.from);
            this.filterFechaHasta.set(event.to);
            this.currentPage.set(0);
            this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo salvo el periodo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipoComprobante.set('');
        this.filterFechaDesde.set(null);
        this.filterFechaHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
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
        const params = toHttpParams({
            periodoId: this.periodoSeleccionado(),
            page: this.currentPage(),
            size: this.pageSize(),
            voucherTipo: codigoSunatDeComprobante(this.filterTipoComprobante()),
            fechaDesde: this.filterFechaDesde() ?? undefined,
            fechaHasta: this.filterFechaHasta() ?? undefined,
            q: this.searchQuery(),
        });
        this.http.get<unknown>(`${environment.apiUrls.accounting}/api/v1/contabilidad/registro-compras`, { params }).subscribe({
            next: (res) => {
                const page = adaptSpringPage<RegistroCompra>(res, this.currentPage(), this.pageSize());
                this.registros.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el registro de compras de este periodo');
                this.registros.set([]);
                this.cargando.set(false);
            }
        });
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

    exportarCSV() {
        // Exportación SERVER-SIDE (mismo endpoint /export que exportConfig, formato csv).
        this.backendExportService.download(this.exportConfig, 'csv');
    }
}
