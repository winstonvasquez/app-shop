import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { toSignal } from '@angular/core/rxjs-interop';

import { CartService } from '@features/cart/services/cart.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { OrderService } from '@core/services/order.service';
import { finalize } from 'rxjs/operators';

import {
    DsButtonComponent,
    DsBadgeComponent,
    DsPriceComponent,
    DsThumbComponent,
} from '@shared/ui/ds';

const FREE_SHIPPING_THRESHOLD = 99;

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [
        TranslateModule,
        LucideAngularModule,
        RouterLink,
        DsButtonComponent,
        DsBadgeComponent,
        DsPriceComponent,
        DsThumbComponent,
    ],
    templateUrl: './cart-page.component.html',
})
export class CartPageComponent implements OnInit {
    cartService   = inject(CartService);
    configService = inject(ConfigService);
    orderService  = inject(OrderService);
    router        = inject(Router);

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;
    cartCount = this.cartService.cartCount;

    mediosPago      = toSignal(this.configService.getMediosPago(),      { initialValue: [] as MedioPago[] });
    certificaciones = toSignal(this.configService.getCertificaciones(), { initialValue: [] as Certificacion[] });

    isCheckingOut    = signal(false);
    coupon           = signal<string>('');
    couponApplying   = signal(false);
    couponError      = signal<string | null>(null);
    appliedCoupon    = signal<string | null>(null);
    private _couponDiscount = signal<number>(0);

    /** Subtotal de los items seleccionados. */
    readonly subtotal = computed(() => this.cartTotal());

    /** Ahorro respecto al precio "stock" (no manejamos originalPrice por item, así que 0 por ahora). */
    readonly savings = signal<number>(0);

    /** Cuánto falta para envío gratis premium (S/ 99). */
    readonly missingForFree = computed(() => Math.max(0, FREE_SHIPPING_THRESHOLD - this.subtotal()));
    readonly freeProgress   = computed(() => {
        const ratio = this.subtotal() / FREE_SHIPPING_THRESHOLD;
        return Math.min(100, Math.max(0, ratio * 100));
    });

    /** Descuento real validado por backend (POST /sales/api/v1/cupones/validate). */
    readonly couponDiscount = computed(() => this._couponDiscount());

    readonly total = computed(() => Math.max(0, this.subtotal() - this.savings() - this.couponDiscount()));

    /** 12 cuotas sin interés. */
    readonly installment = computed(() => +(this.total() / 12).toFixed(2));

    ngOnInit(): void {
        // No data fetching needed — cart vive en CartService (signal).
    }

    onQuantityChange(productId: number, delta: number): void {
        const item = this.cartItems().find(i => i.productId === productId);
        if (!item) return;
        const next = Math.max(1, Math.min(item.stock ?? 99, item.quantity + delta));
        this.cartService.updateQuantity(productId, next);
    }

    setQuantity(productId: number, value: number): void {
        if (Number.isFinite(value) && value > 0) {
            this.cartService.updateQuantity(productId, value);
        }
    }

    toggleSelection(id: number): void { this.cartService.toggleSelection(id); }

    toggleAll(checked: boolean): void { this.cartService.toggleAll(checked); }

    removeFromCart(id: number): void {
        const m = this.cartService as unknown as { removeFromCart?: (id: number) => void };
        m.removeFromCart?.(id);
    }

    onCouponInput(value: string): void { this.coupon.set(value); }

    applyCoupon(): void {
        const code = this.coupon().trim();
        if (!code) return;
        this.couponError.set(null);
        this.couponApplying.set(true);
        this.orderService.validateCoupon(code, this.subtotal()).pipe(
            finalize(() => this.couponApplying.set(false)),
        ).subscribe({
            next: (discount) => {
                this._couponDiscount.set(discount.amount);
                this.appliedCoupon.set(code.toUpperCase());
                this.couponError.set(null);
            },
            error: () => this.couponError.set('Cupón inválido o expirado'),
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
