import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { VentasParametrosService } from '../../services/ventas-parametros.service';

interface PageResponse<T> { content: T[]; totalElements: number; }

interface OrderSummary {
    id: number;
    usuarioId: number;
    fechaPedido: string;
    estado: string;
    total: number;
}

@Component({
    selector: 'app-ventas-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DataTableComponent],
    templateUrl: './ventas-dashboard.component.html',
})
export class VentasDashboardComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly parametros = inject(VentasParametrosService);

    pedidos  = signal<OrderSummary[]>([]);
    cargando  = signal(false);

    totalPedidos      = computed(() => this.pedidos().length);
    pedidosPendientes = computed(() => this.pedidos().filter(p => p.estado === 'PENDIENTE').length);
    montoTotalMes     = computed(() => this.pedidos().reduce((s, p) => s + (p.total ?? 0), 0));
    ticketPromedio    = computed(() =>
        this.totalPedidos() > 0 ? this.montoTotalMes() / this.totalPedidos() : 0
    );
    ventasHoy = computed(() => {
        const hoy = new Date().toDateString();
        return this.pedidos()
            .filter(p => new Date(p.fechaPedido).toDateString() === hoy && p.estado !== 'CANCELADO')
            .reduce((s, p) => s + (p.total ?? 0), 0);
    });

    columns: TableColumn<OrderSummary>[] = [
        { key: 'id', label: 'Pedido', width: '80px',
          render: (row) => `#${row.id}` },
        { key: 'fechaPedido', label: 'Fecha',
          render: (row) => row.fechaPedido
            ? new Date(row.fechaPedido).toLocaleDateString('es-PE') : '-' },
        { key: 'usuarioId', label: 'Cliente',
          render: (row) => `Usuario #${row.usuarioId}` },
        { key: 'total', label: 'Total', align: 'right',
          render: (row) => `S/ ${(row.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoPedido(row.estado)}">${this.parametros.getLabelEstadoPedido(row.estado)}</span>` },
    ];

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        const urlPedidos = `${environment.apiUrls.sales}/api/pedidos?page=0&size=50&sort=fechaPedido,desc`;

        this.http.get<PageResponse<OrderSummary>>(urlPedidos).subscribe({
            next: (res) => { this.pedidos.set(res.content ?? []); this.cargando.set(false); },
            error: () => { this.pedidos.set([]); this.cargando.set(false); }
        });
    }

}
