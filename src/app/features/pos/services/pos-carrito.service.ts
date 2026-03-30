import { Injectable, signal, computed } from '@angular/core';
import { CartItem, ProductoCatalogoPOS } from '../models/catalogo-pos.model';
import { MetodoPagoPos, PagoMixto, TipoCpe } from '../models/venta-pos.model';

@Injectable({ providedIn: 'root' })
export class PosCarritoService {

    // ── State ────────────────────────────────────────────────────
    readonly items = signal<CartItem[]>([]);
    readonly descuento = signal<number>(0);
    readonly metodoPago = signal<MetodoPagoPos>('EFECTIVO');
    readonly tipoCpe = signal<TipoCpe>('BOLETA');
    readonly montoRecibido = signal<number>(0);
    readonly clienteNombre = signal<string>('');
    readonly clienteId = signal<number | null>(null);

    /** Pago dividido: activar para registrar múltiples métodos con monto parcial */
    readonly pagoDividido = signal<boolean>(false);
    readonly pagos = signal<PagoMixto[]>([
        { metodo: 'EFECTIVO', monto: 0 },
        { metodo: 'YAPE',     monto: 0 },
    ]);

    /** Signal para feedback visual: ID de la última variante añadida. Se resetea a null tras 600ms. */
    readonly lastAddedId = signal<number | null>(null);

    // ── Computed ─────────────────────────────────────────────────
    readonly totalBruto = computed(() =>
        this.items().reduce((sum, item) => sum + item.subtotal, 0)
    );

    readonly totalConDescuento = computed(() =>
        Math.max(0, this.totalBruto() - this.descuento())
    );

    readonly baseImponible = computed(() =>
        this.totalConDescuento() / 1.18
    );

    readonly igv = computed(() =>
        this.totalConDescuento() - this.baseImponible()
    );

    readonly vuelto = computed(() => {
        if (this.pagoDividido()) {
            const totalPagado = this.pagos().reduce((s, p) => s + (p.monto || 0), 0);
            return Math.max(0, totalPagado - this.totalConDescuento());
        }
        return Math.max(0, this.montoRecibido() - this.totalConDescuento());
    });

    /** Cuánto falta por cubrir en modo pago dividido */
    readonly faltaPorCubrir = computed(() => {
        if (!this.pagoDividido()) return 0;
        const totalPagado = this.pagos().reduce((s, p) => s + (p.monto || 0), 0);
        return Math.max(0, this.totalConDescuento() - totalPagado);
    });

    /** Método principal (el de mayor monto) cuando hay pago dividido */
    readonly metodoPagoPrimario = computed<MetodoPagoPos>(() => {
        if (!this.pagoDividido()) return this.metodoPago();
        const conMonto = this.pagos().filter(p => p.monto > 0);
        if (conMonto.length === 0) return 'EFECTIVO';
        if (conMonto.length === 1) return conMonto[0].metodo;
        return 'MIXTO';
    });

    readonly itemCount = computed(() =>
        this.items().reduce((sum, item) => sum + item.cantidad, 0)
    );

    readonly isEmpty = computed(() => this.items().length === 0);

    // ── Actions ──────────────────────────────────────────────────

    agregarProducto(variante: ProductoCatalogoPOS): void {
        this.items.update(items => {
            const existing = items.find(i => i.variante.varianteId === variante.varianteId);
            if (existing) {
                return items.map(i =>
                    i.variante.varianteId === variante.varianteId
                        ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.variante.precioFinal }
                        : i
                );
            }
            return [...items, { variante, cantidad: 1, subtotal: variante.precioFinal }];
        });
        // Feedback visual: marca el ID y luego lo limpia tras 600ms
        this.lastAddedId.set(variante.varianteId);
        setTimeout(() => this.lastAddedId.set(null), 600);
    }

    cambiarCantidad(varianteId: number, delta: number): void {
        this.items.update(items =>
            items
                .map(i => {
                    if (i.variante.varianteId !== varianteId) return i;
                    const newQty = Math.max(1, i.cantidad + delta);
                    return { ...i, cantidad: newQty, subtotal: newQty * i.variante.precioFinal };
                })
        );
    }

    setCantidad(varianteId: number, cantidad: number): void {
        if (cantidad < 1) { this.eliminarItem(varianteId); return; }
        this.items.update(items =>
            items.map(i =>
                i.variante.varianteId === varianteId
                    ? { ...i, cantidad, subtotal: cantidad * i.variante.precioFinal }
                    : i
            )
        );
    }

    eliminarItem(varianteId: number): void {
        this.items.update(items => items.filter(i => i.variante.varianteId !== varianteId));
    }

    vaciarCarrito(): void {
        this.items.set([]);
        this.descuento.set(0);
        this.montoRecibido.set(0);
        this.metodoPago.set('EFECTIVO');
        this.tipoCpe.set('BOLETA');
        this.clienteNombre.set('');
        this.clienteId.set(null);
        this.pagoDividido.set(false);
        this.pagos.set([{ metodo: 'EFECTIVO', monto: 0 }, { metodo: 'YAPE', monto: 0 }]);
    }

    togglePagoDividido(): void {
        const on = !this.pagoDividido();
        this.pagoDividido.set(on);
        if (on) {
            // Pre-llenar primer método con el total
            this.pagos.set([
                { metodo: this.metodoPago() === 'MIXTO' ? 'EFECTIVO' : (this.metodoPago() as Exclude<MetodoPagoPos,'MIXTO'>), monto: this.totalConDescuento() },
                { metodo: 'YAPE', monto: 0 },
            ]);
        }
    }

    setPagoMonto(index: number, monto: number): void {
        this.pagos.update(list => list.map((p, i) => i === index ? { ...p, monto: Math.max(0, monto) } : p));
    }

    setPagoMetodo(index: number, metodo: Exclude<MetodoPagoPos, 'MIXTO'>): void {
        this.pagos.update(list => list.map((p, i) => i === index ? { ...p, metodo } : p));
    }

    agregarPago(): void {
        this.pagos.update(list => [...list, { metodo: 'EFECTIVO', monto: 0 }]);
    }

    quitarPago(index: number): void {
        if (this.pagos().length <= 2) return;
        this.pagos.update(list => list.filter((_, i) => i !== index));
    }

    setDescuento(valor: number): void { this.descuento.set(Math.max(0, valor)); }
    setMetodoPago(metodo: MetodoPagoPos): void { this.metodoPago.set(metodo); }
    setTipoCpe(tipo: TipoCpe): void { this.tipoCpe.set(tipo); }
    setMontoRecibido(monto: number): void { this.montoRecibido.set(monto); }
    setCliente(id: number | null, nombre: string): void {
        this.clienteId.set(id);
        this.clienteNombre.set(nombre);
    }
}
