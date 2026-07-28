import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AsientoService, LibroMayorEntry } from '../../services/asiento.service';
import { CuentaService, CuentaContable } from '../../services/cuenta.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';
import { CatalogService } from '@core/services/catalog.service';
import { ButtonComponent } from '@shared/components';
import {
    DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-libro-mayor',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, ButtonComponent, DataTableComponent],
    templateUrl: './libro-mayor.component.html'
})
export class LibroMayorComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private cuentaService = inject(CuentaService);
    private periodoService = inject(PeriodoService);
    private readonly catalog = inject(CatalogService);

    cuentas = signal<CuentaContable[]>([]);
    periodos = signal<PeriodoContable[]>([]);
    periodoSeleccionado = signal<string>('');
    movimientos = signal<LibroMayorEntry[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    // Filtros (TODOS server-side). `cuenta` ahora es opcional: sin ella el backend
    // trae el mayor de TODAS las cuentas del periodo.
    readonly filterCuenta = signal<string | null>(null);
    readonly filterTipoAsiento = signal<string | null>(null);
    readonly filterOrigen = signal<string | null>(null);
    readonly filterTipoCuenta = signal<string | null>(null);
    readonly filterFechaDesde = signal<string | null>(null);
    readonly filterFechaHasta = signal<string | null>(null);
    readonly searchQuery = signal('');

    readonly currentPage = signal(0);
    readonly pageSize = signal<number>(PAGINATION.defaultPageSize);
    readonly totalElements = signal(0);
    readonly totalPages = signal(0);

    /** Info de la cuenta seleccionada (solo si el usuario filtró por una cuenta puntual). */
    readonly cuentaInfo = computed<CuentaContable | null>(() => {
        const id = this.filterCuenta();
        if (!id) return null;
        return this.cuentas().find(c => c.id === id) ?? null;
    });

    // Saldo/Debe/Haber se calculan SOLO sobre la página actual (el backend pagina
    // el libro mayor desde la ronda 2026-07-27; "saldoAcumulado" es por fila, no total).
    readonly totalDebe = computed(() => this.movimientos().reduce((s, m) => s + (m.debe ?? 0), 0));
    readonly totalHaber = computed(() => this.movimientos().reduce((s, m) => s + (m.haber ?? 0), 0));

    readonly columns: TableColumn<LibroMayorEntry>[] = [
        {
            key: 'fecha', label: 'Fecha', html: true,
            render: m => `<span class="font-mono">${m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '-'}</span>`
        },
        {
            key: 'numero', label: 'N° Asiento', html: true,
            render: m => `<span class="font-mono font-bold">${m.numero}</span>`
        },
        {
            key: 'cuentaCodigo', label: 'Cuenta', html: true,
            render: m => `<span class="font-mono font-bold">${m.cuentaCodigo}</span> <span class="text-sm" style="color:var(--color-text-muted)">${m.cuentaNombre}</span>`
        },
        { key: 'glosa', label: 'Descripción' },
        {
            key: 'debe', label: 'Debe', align: 'right', html: true,
            render: m => `<span class="font-mono">${m.debe > 0 ? 'S/ ' + m.debe.toFixed(2) : ''}</span>`
        },
        {
            key: 'haber', label: 'Haber', align: 'right', html: true,
            render: m => `<span class="font-mono">${m.haber > 0 ? 'S/ ' + m.haber.toFixed(2) : ''}</span>`
        },
        {
            key: 'saldoAcumulado', label: 'Saldo acumulado', align: 'right', html: true,
            render: m => `<span class="font-mono" style="${m.saldoAcumulado < 0 ? 'color:var(--color-error)' : ''}">S/ ${m.saldoAcumulado.toFixed(2)}</span>`
        }
    ];

    // Filtros del toolbar. periodo va incluido: es obligatorio para el endpoint.
    readonly filters: FilterConfig[] = [
        signalFilter('periodo', 'Periodo', this.periodos,
            p => ({ value: p.id, label: `${p.nombre} (${p.estado})` })),
        signalFilter('cuenta', 'Cuenta', this.cuentas,
            c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` })),
        catalogFilter(this.catalog, 'TIPO_ASIENTO_CONTABLE', 'tipoAsiento', 'Tipo de asiento'),
        catalogFilter(this.catalog, 'ORIGEN_ASIENTO_CONTABLE', 'origen', 'Origen del asiento'),
        catalogFilter(this.catalog, 'TIPO_CUENTA_PCGE', 'tipoCuenta', 'Tipo de cuenta PCGE'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fecha', label: 'Fecha del movimiento' }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.accounting}/api/v1/contabilidad/libro-mayor/export`,
        filename: 'libro-mayor',
        params: () => ({
            periodo: this.periodoSeleccionado() || undefined,
            cuenta: this.filterCuenta() ?? undefined,
            fechaDesde: this.filterFechaDesde() ?? undefined,
            fechaHasta: this.filterFechaHasta() ?? undefined,
            tipoAsiento: this.filterTipoAsiento() ?? undefined,
            origen: this.filterOrigen() ?? undefined,
            tipoCuenta: this.filterTipoCuenta() ?? undefined,
            search: this.searchQuery() || undefined,
        }),
    };

    ngOnInit() {
        // Cuentas para el select de filtro: solo las que aceptan movimiento (hojas PCGE).
        this.cuentaService.listarTodas().subscribe({
            next: (lista) => this.cuentas.set(lista.filter(c => c.aceptaMovimiento)),
            error: () => {}
        });
        this.periodoService.listar().subscribe({
            next: (lista) => {
                this.periodos.set(lista);
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) {
                    this.periodoSeleccionado.set(abierto.id);
                    this.cargarMayor();
                }
            },
            error: () => {}
        });
    }

    cambiarPeriodo(id: string) {
        this.periodoSeleccionado.set(id);
        this.currentPage.set(0);
        if (id) {
            this.cargarMayor();
        } else {
            this.movimientos.set([]);
            this.totalElements.set(0);
            this.totalPages.set(0);
        }
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargarMayor();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'periodo') {
            this.cambiarPeriodo(event.value != null ? String(event.value) : '');
            return;
        }
        const valor = event.value != null ? String(event.value) : null;
        switch (event.field) {
            case 'cuenta':      this.filterCuenta.set(valor); break;
            case 'tipoAsiento': this.filterTipoAsiento.set(valor); break;
            case 'origen':      this.filterOrigen.set(valor); break;
            case 'tipoCuenta':  this.filterTipoCuenta.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarMayor();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fecha') return;
        this.filterFechaDesde.set(event.from);
        this.filterFechaHasta.set(event.to);
        this.currentPage.set(0);
        this.cargarMayor();
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
        this.filterTipoCuenta.set(null);
        this.filterFechaDesde.set(null);
        this.filterFechaHasta.set(null);
        this.currentPage.set(0);
        this.periodoSeleccionado.set('');
        this.movimientos.set([]);
        this.totalElements.set(0);
        this.totalPages.set(0);
    }

    onPageChange(event: PaginationEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargarMayor();
    }

    cargarMayor() {
        const periodoId = this.periodoSeleccionado();
        if (!periodoId) return;
        this.cargando.set(true);
        this.error.set(null);
        this.asientoService.obtenerLibroMayor(periodoId, {
            page: this.currentPage(),
            size: this.pageSize(),
            cuenta: this.filterCuenta(),
            fechaDesde: this.filterFechaDesde(),
            fechaHasta: this.filterFechaHasta(),
            tipoAsiento: this.filterTipoAsiento(),
            origen: this.filterOrigen(),
            tipoCuenta: this.filterTipoCuenta(),
            search: this.searchQuery() || null,
        }).subscribe({
            next: (page) => {
                this.movimientos.set(page.content ?? []);
                this.totalElements.set(pageTotalElements(page));
                this.totalPages.set(pageTotalPages(page));
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el libro mayor');
                this.cargando.set(false);
            }
        });
    }
}
