import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ExportService } from '../../../../shared/services/export.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';

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
    private readonly exportService = inject(ExportService);

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

    // Filtro de estado para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        { field: 'estado', label: 'Todos los estados', options: of(this.estadoOptions) }
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
          render: (row) => `S/ ${(row.total ?? 0).toFixed(2)}` },
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
        }
    }

    onPageChange(event: PaginationEvent): void {
        this.pagina.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        const cabecera = ['N°Ticket', 'Fecha', 'Cajero', 'Cliente', 'Metodo Pago', 'CPE', 'Subtotal', 'IGV', 'Descuento', 'Total', 'Estado'];
        const filas = this.ventas().map(v => [
            v.numeroTicket ?? '',
            v.fechaCreacion ?? '',
            v.cajeroNombre ?? '',
            v.clienteNombre ?? 'Consumidor final',
            v.metodoPago ?? '',
            v.tipoCpe ?? '',
            String(v.subtotal ?? 0),
            String(v.igv ?? 0),
            String(v.descuento ?? 0),
            String(v.total ?? 0),
            v.estado ?? '',
        ]);
        this.exportService.exportCsv([cabecera, ...filas], `reporte-ventas-pos-${new Date().toISOString().substring(0, 10)}`);
    }

    exportarExcel(): void {
        const cabecera = ['N°Ticket', 'Fecha', 'Cajero', 'Cliente', 'Metodo Pago', 'CPE', 'Subtotal', 'IGV', 'Descuento', 'Total', 'Estado'];
        const filas = this.ventas().map(v => [
            v.numeroTicket ?? '',
            v.fechaCreacion ?? '',
            v.cajeroNombre ?? '',
            v.clienteNombre ?? 'Consumidor final',
            v.metodoPago ?? '',
            v.tipoCpe ?? '',
            String(v.subtotal ?? 0),
            String(v.igv ?? 0),
            String(v.descuento ?? 0),
            String(v.total ?? 0),
            v.estado ?? '',
        ]);
        this.exportService.exportExcel(cabecera, filas, 'reporte-ventas');
    }
}
