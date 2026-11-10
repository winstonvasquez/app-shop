import { Component, effect, inject, signal, computed, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { toSignal } from '@angular/core/rxjs-interop';

import { CartService, CartItem } from '@features/cart/services/cart.service';
import { lineasParaCupon } from '@features/cart/utils/carrito.util';
import { estadoEnvioGratis } from '@features/cart/utils/envio-gratis';
import { ZonaEnvioService } from '@core/services/zona-envio.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { OrderService } from '@core/services/order.service';
import { WishlistService } from '@core/services/wishlist.service';
import { finalize } from 'rxjs/operators';

import {
    DsButtonComponent,
    DsPriceComponent,
    DsThumbComponent,
} from '@shared/ui/ds';

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [
        TranslateModule,
        LucideAngularModule,
        RouterLink,
        DsButtonComponent,
        DsPriceComponent,
        DsThumbComponent,
    ],
    templateUrl: './cart-page.component.html',
})
export class CartPageComponent {
    cartService   = inject(CartService);
    configService = inject(ConfigService);
    orderService  = inject(OrderService);
    wishlistService = inject(WishlistService);
    router        = inject(Router);
    private zonaEnvioService = inject(ZonaEnvioService);

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;
    cartCount = this.cartService.cartCount;

    mediosPago      = toSignal(this.configService.getMediosPago(),      { initialValue: [] as MedioPago[] });
    certificaciones = toSignal(this.configService.getCertificaciones(), { initialValue: [] as Certificacion[] });

    isCheckingOut    = signal(false);
    coupon           = signal<string>('');
    couponApplying   = signal(false);
    couponError      = signal<string | null>(null);
    /** El cupón vive en CartService: el checkout lo precarga y lo revalida. */
    appliedCoupon    = this.cartService.appliedCoupon;
    private _couponDiscount = signal<number>(0);

    /** Subtotal de los items seleccionados. */
    readonly subtotal = computed(() => this.cartTotal());

    /** Ahorro respecto al precio "stock" (no manejamos originalPrice por item, así que 0 por ahora). */
    readonly savings = signal<number>(0);

    /** Descuento real validado por backend (POST /sales/api/v1/cupones/validate). */
    readonly couponDiscount = computed(() => this._couponDiscount());

    /** Envío gratis: misma regla que el servidor (subtotal − cupón >= umbral real). null = no hay promesa que mostrar. */
    readonly envioGratis = computed(() =>
        estadoEnvioGratis(this.subtotal() - this.savings() - this.couponDiscount(), this.zonaEnvioService.envioGratisDesde()));

    readonly total = computed(() => Math.max(0, this.subtotal() - this.savings() - this.couponDiscount()));

    /** 12 cuotas sin interés. */
    readonly installment = computed(() => +(this.total() / 12).toFixed(2));

    constructor() {
        this.zonaEnvioService.cargarUmbral();
        // Revalida el cupón ya aplicado al entrar y cada vez que cambia la selección/cantidades:
        // la estimación depende de las líneas seleccionadas (alcance PRODUCTO/CATEGORÍA).
        effect(() => {
            this.cartItems();
            const code = untracked(() => this.cartService.appliedCoupon());
            if (code) untracked(() => this.validarCupon(code));
        });
    }

    onQuantityChange(item: CartItem, delta: number): void {
        const next = Math.max(1, Math.min(item.stock ?? 99, item.quantity + delta));
        this.cartService.updateQuantity(item.productId, item.variantId, next);
    }

    setQuantity(item: CartItem, value: number): void {
        if (Number.isFinite(value) && value > 0) {
            this.cartService.updateQuantity(item.productId, item.variantId, value);
        }
    }

    toggleSelection(item: CartItem): void { this.cartService.toggleSelection(item.productId, item.variantId); }

    toggleAll(checked: boolean): void { this.cartService.toggleAll(checked); }

    removeFromCart(item: CartItem): void {
        this.cartService.removeFromCart(item.productId, item.variantId);
    }

    /** Mueve un ítem del carrito a la lista de deseos (persiste) y lo quita del carrito. */
    moverAFavoritos(item: CartItem): void {
        this.wishlistService.add(item.productId, item.variantId ?? undefined).subscribe({
            next: () => this.cartService.removeFromCart(item.productId, item.variantId),
            error: () => { /* si ya está en favoritos o falla, igual lo quitamos del carrito */
                this.cartService.removeFromCart(item.productId, item.variantId);
            },
        });
    }

    onCouponInput(value: string): void { this.coupon.set(value); }

    applyCoupon(): void {
        const code = this.coupon().trim();
        if (!code) return;
        this.validarCupon(code);
    }

    private validarCupon(code: string): void {
        this.couponError.set(null);
        this.couponApplying.set(true);
        this.orderService.validateCoupon(code, this.subtotal(), lineasParaCupon(this.cartItems())).pipe(
            finalize(() => this.couponApplying.set(false)),
        ).subscribe({
            next: (discount) => {
                this._couponDiscount.set(discount.amount);
                this.appliedCoupon.set(code.trim().toUpperCase());
            },
            error: () => {
                this._couponDiscount.set(0);
                this.appliedCoupon.set(null);
                this.couponError.set('Cupón inválido o expirado');
            },
        });
    }

    checkout(): void {
        if (this.isCheckingOut()) return;
        this.isCheckingOut.set(true);
        this.router.navigate(['/checkout']).finally(() => this.isCheckingOut.set(false));
    }

    /** Trick para acceder a paymentMethods + certificaciones desde el template sin pipes async. */
    paymentLogos = computed(() => this.mediosPago().slice(0, 6));
}
