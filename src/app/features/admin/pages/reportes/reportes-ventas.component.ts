import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { BackendExportService } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';

interface VentaPos {
    id: number;
    numeroTicket: string;
    tipoCpe: string;
    metodoPago: string;
    subtotal: number;
    igv: number;
    descuento: number;
    total: number;
    estado: string;
    fechaCreacion: string;
    cajeroNombre: string;
    clienteNombre?: string;
}

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Component({
    selector: 'app-reportes-ventas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DataTableComponent, ButtonComponent],
    templateUrl: './reportes-ventas.component.html',
    styleUrls: ['./reportes-ventas.component.scss'],
})
export class ReportesVentasComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly backendExportService = inject(BackendExportService);

    ventas = signal<VentaPos[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);
    pagina = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Búsqueda/filtro server-side (por botón Buscar)
    private searchQuery = signal('');
    private filtroEstado = signal('');
    private filtroMetodoPago = signal('');
    private filtroFechaCreacionDesde = signal<string | undefined>(undefined);
    private filtroFechaCreacionHasta = signal<string | undefined>(undefined);

    totalVentas = computed(() => this.ventas().length);
    montoTotal = computed(() => this.ventas().reduce((sum, v) => sum + (v.total ?? 0), 0));
    ticketPromedio = computed(() => this.totalVentas() > 0 ? this.montoTotal() / this.totalVentas() : 0);
    ventasCompletadas = computed(() => this.ventas().filter(v => v.estado === 'COMPLETADA').length);
    igvTotal = computed(() => this.ventas().reduce((sum, v) => sum + (v.igv ?? 0), 0));
    pages = computed(() => Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i));

    readonly estadoOptions = [
        { value: 'COMPLETADA', label: 'Completada' },
        { value: 'ANULADA',    label: 'Anulada' },
    ];

    readonly metodoPagoOptions = [
        { value: 'EFECTIVO',   label: 'Efectivo' },
        { value: 'TARJETA',    label: 'Tarjeta' },
        { value: 'YAPE',       label: 'Yape' },
        { value: 'PLIN',       label: 'Plin' },
        { value: 'MIXTO',      label: 'Mixto' },
        { value: 'GIFT_CARD',  label: 'Gift Card' },
    ];

    // Filtros de estado + método de pago para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        { field: 'estado', label: 'Todos los estados', options: of(this.estadoOptions) },
        { field: 'metodoPago', label: 'Todos los métodos', options: of(this.metodoPagoOptions) },
    ];

    // Filtro de rango de fecha de creación
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha' }
    ];

    columns: TableColumn<VentaPos>[] = [
        { key: 'numeroTicket', label: 'N° Ticket' },
        { key: 'fechaCreacion', label: 'Fecha',
          render: (row) => row.fechaCreacion
            ? new Date(row.fechaCreacion).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : '-' },
        { key: 'cajeroNombre', label: 'Cajero' },
        { key: 'clienteNombre', label: 'Cliente',
          render: (row) => row.clienteNombre ?? 'Consumidor final' },
        { key: 'metodoPago', label: 'Método Pago', html: true,
          render: (row) => `<span class="badge badge-neutral">${row.metodoPago}</span>` },
        { key: 'tipoCpe', label: 'CPE' },
        { key: 'total', label: 'Total', align: 'right',
          render: (row) => `${CURRENCY_DISPLAY.SYMBOL_PEN} ${(row.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="badge ${row.estado === 'COMPLETADA' ? 'badge-success' : 'badge-error'}">${row.estado}</span>` },
    ];

    actions: TableAction<VentaPos>[] = [
        { label: 'Ver', icon: '👁', class: 'btn-view', onClick: (_row) => {} }
    ];

    ngOnInit() {
        this.cargar();
    }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        const companyId = this.auth.currentUser()?.activeCompanyId ?? 1;
        const params: Record<string, string> = {
            companyId: String(companyId),
            page: String(this.pagina()),
            size: String(this.pageSize()),
        };
        if (this.searchQuery()) params['search'] = this.searchQuery();
        if (this.filtroEstado()) params['estado'] = this.filtroEstado();
        if (this.filtroMetodoPago()) params['metodoPago'] = this.filtroMetodoPago();
        if (this.filtroFechaCreacionDesde()) params['fechaCreacionDesde'] = this.filtroFechaCreacionDesde()!;
        if (this.filtroFechaCreacionHasta()) params['fechaCreacionHasta'] = this.filtroFechaCreacionHasta()!;
        this.http.get<PageResponse<VentaPos>>(`${environment.apiUrls.sales}/api/pos/ventas`, { params }).subscribe({
            next: (page) => {
                this.ventas.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.pagina.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filtroEstado.set(event.value != null ? String(event.value) : '');
            this.pagina.set(0);
            this.cargar();
        } else if (event.field === 'metodoPago') {
            this.filtroMetodoPago.set(event.value != null ? String(event.value) : '');
            this.pagina.set(0);
            this.cargar();
        }
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaCreacion') return;
        this.filtroFechaCreacionDesde.set(event.from ?? undefined);
        this.filtroFechaCreacionHasta.set(event.to ?? undefined);
        this.pagina.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent): void {
        this.pagina.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    imprimir(): void {
        window.print();
    }

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (mismos filtros companyId + search + estado que el listado actual).
     * Ver GET /api/pos/ventas/export en microshopventas.
     */
    private exportParams(): Record<string, string | number | boolean | null | undefined> {
        const companyId = this.auth.currentUser()?.activeCompanyId ?? 1;
        return {
            companyId,
            search: this.searchQuery(),
            estado: this.filtroEstado(),
            metodoPago: this.filtroMetodoPago(),
            fechaCreacionDesde: this.filtroFechaCreacionDesde(),
            fechaCreacionHasta: this.filtroFechaCreacionHasta(),
        };
    }

    onExportarCsv(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.sales}/api/pos/ventas/export`,
            filename: 'reporte-ventas-pos',
            params: () => this.exportParams(),
        }, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.sales}/api/pos/ventas/export`,
            filename: 'reporte-ventas-pos',
            params: () => this.exportParams(),
        }, 'xlsx');
    }
}
