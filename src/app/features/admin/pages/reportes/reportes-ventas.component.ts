import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ExportService } from '../../../../shared/services/export.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';

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
    imports: [DecimalPipe, FormsModule, DataTableComponent],
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
    busqueda = '';
    filtroEstado = '';
    pagina = signal(0);
    totalElements = signal(0);
    totalPages = signal(0);

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

    ventasFiltradas = computed(() => {
        let lista = this.ventas();
        const q = this.busqueda.toLowerCase();
        if (q) {
            lista = lista.filter(v =>
                v.numeroTicket?.toLowerCase().includes(q) ||
                v.cajeroNombre?.toLowerCase().includes(q)
            );
        }
        if (this.filtroEstado) {
            lista = lista.filter(v => v.estado === this.filtroEstado);
        }
        return lista;
    });

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);
        const companyId = this.auth.currentUser()?.activeCompanyId ?? 1;
        const url = `${environment.apiUrls.sales}/api/pos/ventas?companyId=${companyId}&page=${this.pagina()}&size=100`;
        this.http.get<PageResponse<VentaPos>>(url).subscribe({
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

    irPagina(p: number) {
        this.pagina.set(p);
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
