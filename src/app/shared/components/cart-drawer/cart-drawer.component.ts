import { Component, inject, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CartItem, CartService } from '@features/cart/services/cart.service';

@Component({
    selector: 'app-cart-drawer',
    standalone: true,
    imports: [TranslateModule, LucideAngularModule],
    templateUrl: './cart-drawer.component.html',
    styleUrls: ['./cart-drawer.component.scss']
})
export class CartDrawerComponent {
    cartService = inject(CartService);
    router = inject(Router);

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;
    cartCount = this.cartService.cartCount;
    selectedCount = this.cartService.selectedCount;
    allSelected = this.cartService.allSelected;

    isOpen = computed(() => this.cartService.isDrawerOpen());

    /** Subtotal sin descuentos = mismo cartTotal por ahora (drawer simple) */
    subtotal = this.cartTotal;

    /** Cuántos items distintos hay seleccionados */
    selectedItemsCount = computed(() =>
        this.cartItems().filter(i => i.selected).length
    );

    /** Suma de unidades seleccionadas (para el botón) */
    selectedUnitsCount = computed(() =>
        this.cartItems()
            .filter(i => i.selected)
            .reduce((acc, i) => acc + i.quantity, 0)
    );

    toggleSelection(item: CartItem) { this.cartService.toggleSelection(item.productId, item.variantId); }
    toggleAll(checked: boolean) { this.cartService.toggleAll(checked); }
    close() { this.cartService.closeDrawer(); }

    checkout() {
        this.cartService.closeDrawer();
        this.router.navigate(['/checkout']);
    }

    goToCart() {
        this.cartService.closeDrawer();
        this.router.navigate(['/cart']);
    }

    incQty(item: CartItem) {
        if (item.quantity >= (item.stock ?? 99)) return;
        this.cartService.updateQuantity(item.productId, item.variantId, item.quantity + 1);
    }

    decQty(item: CartItem) {
        if (item.quantity <= 1) return;
        this.cartService.updateQuantity(item.productId, item.variantId, item.quantity - 1);
    }

    removeItem(item: CartItem) {
        this.cartService.removeFromCart(item.productId, item.variantId);
    }

    /** Total de una línea (precio × cantidad) */
    lineTotal(price: number, qty: number): number {
        return +(price * qty).toFixed(2);
    }
}
