import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OrderResponse } from '@core/models/order.model';
import { pageTotalPages } from '@core/models/pagination.model';
import { AuthService } from '@core/auth/auth.service';
import { OrderService, MisPedidosFiltros } from '@core/services/order.service';
import { CatalogService } from '@core/services/catalog.service';
import {
    DsAccountShellComponent,
    DsButtonComponent,
    DsBadgeComponent,
    DsBadgeTone,
    DsInputComponent,
} from '@shared/ui/ds';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-account-orders',
    standalone: true,
    imports: [
        RouterLink,
        FormsModule,
        DatePipe,
        DecimalPipe,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
        DsBadgeComponent,
        DsInputComponent,
    ],
    templateUrl: './account-orders.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrdersComponent implements OnInit {
    private orderService = inject(OrderService);
    private authService  = inject(AuthService);
    readonly catalog      = inject(CatalogService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    orders      = signal<OrderResponse[]>([]);
    loading     = signal(true);
    error       = signal<string | null>(null);
    totalPages  = signal(0);
    currentPage = signal(0);

    // ── Filtros server-side (TODO va al backend, nunca se filtra la página cargada) ──
    readonly searchQuery      = signal('');
    readonly filterEstado     = signal('');
    readonly filterCpeTipo    = signal('');
    readonly filterCpeEstado  = signal('');
    readonly filterMetodoPago = signal('');
    readonly filterFechaDesde = signal('');
    readonly filterFechaHasta = signal('');

    readonly estadosPedido = this.catalog.options('ESTADO_PEDIDO');
    readonly tiposCpe      = this.catalog.options('TIPO_COMPROBANTE');
    readonly estadosCpe    = this.catalog.options('ESTADO_CPE_SUNAT');
    readonly metodosPago   = this.catalog.options('METODO_PAGO');

    readonly hasActiveFilters = computed(() =>
        !!(this.searchQuery() || this.filterEstado() || this.filterCpeTipo() || this.filterCpeEstado()
            || this.filterMetodoPago() || this.filterFechaDesde() || this.filterFechaHasta())
    );

    ngOnInit(): void { this.loadOrders(0); }

    loadOrders(page: number): void {
        this.loading.set(true);
        this.error.set(null);

        const filtros: MisPedidosFiltros = {
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            cpeTipo: this.filterCpeTipo() || undefined,
            cpeEstado: this.filterCpeEstado() || undefined,
            metodoPago: this.filterMetodoPago() || undefined,
            fechaPedidoDesde: this.filterFechaDesde() || undefined,
            fechaPedidoHasta: this.filterFechaHasta() || undefined,
        };

        this.orderService.getMisPedidos(page, PAGINATION.defaultPageSize, filtros).subscribe({
            next: (response) => {
                this.orders.set(response.content ?? []);
                this.totalPages.set(pageTotalPages(response));
                this.currentPage.set(response.number);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Error al cargar los pedidos.');
                this.loading.set(false);
            },
        });
    }

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.loadOrders(0);
    }

    onEstadoChange(value: string): void {
        this.filterEstado.set(value);
        this.loadOrders(0);
    }

    onCpeTipoChange(value: string): void {
        this.filterCpeTipo.set(value);
        this.loadOrders(0);
    }

    onCpeEstadoChange(value: string): void {
        this.filterCpeEstado.set(value);
        this.loadOrders(0);
    }

    onMetodoPagoChange(value: string): void {
        this.filterMetodoPago.set(value);
        this.loadOrders(0);
    }

    onFechaDesdeChange(value: string): void {
        this.filterFechaDesde.set(value);
        this.loadOrders(0);
    }

    onFechaHastaChange(value: string): void {
        this.filterFechaHasta.set(value);
        this.loadOrders(0);
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterCpeTipo.set('');
        this.filterCpeEstado.set('');
        this.filterMetodoPago.set('');
        this.filterFechaDesde.set('');
        this.filterFechaHasta.set('');
        this.loadOrders(0);
    }

    prevPage(): void { if (this.currentPage() > 0)                  this.loadOrders(this.currentPage() - 1); }
    nextPage(): void { if (this.currentPage() < this.totalPages()-1) this.loadOrders(this.currentPage() + 1); }

    estadoTone(estado: string): DsBadgeTone {
        const map: Record<string, DsBadgeTone> = {
            'PENDIENTE':      'warn',
            'PAGADO':         'info',
            'EN_PREPARACION': 'info',
            'ENVIADO':        'info',
            'ENTREGADO':      'success',
            'CANCELADO':      'danger',
        };
        return map[estado] ?? 'neutral';
    }

    /** Etiqueta desde el catálogo ESTADO_PEDIDO (fuente única) — fallback al propio código. */
    estadoLabel(estado: string): string {
        return this.catalog.label('ESTADO_PEDIDO', estado) || estado;
    }
}
