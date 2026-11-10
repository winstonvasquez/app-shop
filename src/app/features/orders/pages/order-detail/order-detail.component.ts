import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { CartService } from '@features/cart/services/cart.service';
import { OrderPostventaService, PedidoComprobante, PedidoTracking } from '../../services/order-postventa.service';

/** Estados del pedido con orden de progresión para el timeline */
const ESTADOS_TIMELINE = [
    { key: 'PENDIENTE', label: 'Pendiente' },
    { key: 'PAGADO', label: 'Pagado' },
    { key: 'ENVIADO', label: 'Enviado' },
    { key: 'ENTREGADO', label: 'Entregado' },
];

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [RouterLink, DatePipe, DecimalPipe],
    templateUrl: './order-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);
    private cartService = inject(CartService);
    private postventa = inject(OrderPostventaService);
    private auth = inject(AuthService);
    readonly catalog = inject(CatalogService);

    order = signal<OrderResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    readonly estadosTimeline = ESTADOS_TIMELINE;
    /** Primar el catálogo: `catalog.label` del template sólo lo lee. */
    readonly estadosPedido = this.catalog.options('ESTADO_PEDIDO');
    readonly estadosCpe = this.catalog.options('ESTADO_CPE_SUNAT');

    tracking = signal<PedidoTracking | null>(null);
    comprobante = signal<PedidoComprobante | null>(null);

    // Cancelación (sólo el comprador, sólo PENDIENTE)
    confirmandoCancelar = signal(false);
    cancelando = signal(false);
    cancelError = signal<string | null>(null);

    // Reseñas por producto entregado (el backend sólo las acepta con sesión)
    readonly puedeResenar = computed(() => !!this.auth.currentUser() && this.order()?.estado === 'ENTREGADO');
    resenando = signal<number | null>(null);
    resenaCalificacion = signal(5);
    resenaComentario = signal('');
    enviandoResena = signal(false);
    resenaError = signal<string | null>(null);
    resenados = signal<ReadonlySet<number>>(new Set());
    readonly estrellas = [1, 2, 3, 4, 5];

    private orderId = 0;

    ngOnInit(): void {
        this.orderId = Number(this.route.snapshot.paramMap.get('id'));
        if (!this.orderId) {
            this.error.set('ID de pedido inválido.');
            this.loading.set(false);
            return;
        }
        this.cargar();
    }

    private cargar(): void {
        this.orderService.getById(this.orderId).subscribe({
            next: (o) => {
                this.order.set(o);
                this.loading.set(false);
                this.cargarSecundarios(o);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'No se pudo cargar el pedido.');
                this.loading.set(false);
            },
        });
    }

    /** Seguimiento y comprobante son tarjetas accesorias: si fallan, simplemente no se pintan. */
    private cargarSecundarios(o: OrderResponse): void {
        if (o.estado === 'ENVIADO' || o.estado === 'ENTREGADO') {
            this.postventa.getTracking(o.id).subscribe({ next: t => this.tracking.set(t), error: () => this.tracking.set(null) });
        }
        if (o.estado !== 'CANCELADO' && o.estado !== 'PENDIENTE_PAGO') {
            this.postventa.getComprobante(o.id).subscribe({ next: c => this.comprobante.set(c), error: () => this.comprobante.set(null) });
        }
    }

    /** Suma de las líneas; el total del pedido ya trae cupón y envío aplicados. */
    subtotalLineas(): number {
        return (this.order()?.detalles ?? []).reduce((acc, d) => acc + d.subtotal, 0);
    }

    /** El envío existe en logística (si no, el backend responde `SIN_DATOS`). */
    tieneEnvio(t: PedidoTracking): boolean {
        return !!t.trackingNumber;
    }

    /** El comprador sólo puede anular un pedido PENDIENTE; luego hay que contactar a la tienda. */
    cancelarPedido(): void {
        if (this.cancelando()) return;
        this.cancelando.set(true);
        this.cancelError.set(null);
        this.orderService.cancelOrder(this.orderId, 'USUARIO').subscribe({
            next: () => {
                this.cancelando.set(false);
                this.confirmandoCancelar.set(false);
                this.cargar();
            },
            error: (err: Error) => {
                this.cancelando.set(false);
                this.cancelError.set(err.message);
            },
        });
    }

    abrirResena(productoId: number): void {
        this.resenando.set(productoId);
        this.resenaCalificacion.set(5);
        this.resenaComentario.set('');
        this.resenaError.set(null);
    }

    enviarResena(productoId: number): void {
        if (this.enviandoResena()) return;
        this.enviandoResena.set(true);
        this.resenaError.set(null);
        this.postventa.crearResena({
            productoId,
            calificacion: this.resenaCalificacion(),
            comentario: this.resenaComentario().trim(),
        }).subscribe({
            next: () => {
                this.enviandoResena.set(false);
                this.resenando.set(null);
                this.resenados.update(s => new Set(s).add(productoId));
            },
            // «Ya has dejado una reseña…» y «no compraste…» llegan en el mensaje del backend.
            error: (err: Error) => {
                this.enviandoResena.set(false);
                this.resenaError.set(err.message);
            },
        });
    }

    /** Índice del estado actual en el timeline (0-based). */
    currentEstadoIndex(): number {
        const estado = this.order()?.estado ?? '';
        // Cancelado no encaja en el timeline lineal
        if (estado === 'CANCELADO') return -1;
        const idx = ESTADOS_TIMELINE.findIndex(e => e.key === estado);
        return idx >= 0 ? idx : 0;
    }

    /** "Volver a comprar": re-agrega todos los ítems del pedido al carrito y abre el drawer. */
    reordenar(): void {
        const o = this.order();
        if (!o?.detalles?.length) return;
        for (const d of o.detalles) {
            this.cartService.addToCart({
                id: d.productoId,
                variantId: d.varianteId,
                sku: d.sku,
                variantName: d.varianteNombre,
                name: d.productoNombre,
                price: d.precioUnitario,
                quantity: d.cantidad,
                image: '',
            });
        }
        this.cartService.openDrawer();
    }

    getEstadoBadgeClass(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'badge badge-warning',
            PAGADO: 'badge badge-accent',
            ENVIADO: 'badge badge-accent',
            ENTREGADO: 'badge badge-success',
            CANCELADO: 'badge badge-error',
        };
        return map[estado] ?? 'badge badge-neutral';
    }
}
