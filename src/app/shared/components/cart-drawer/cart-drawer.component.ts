
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CartService } from '@features/cart/services/cart.service';

import { Router } from '@angular/router';

@Component({
    selector: 'app-cart-drawer',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './cart-drawer.component.html',
    styleUrls: ['./cart-drawer.component.scss']
})
export class CartDrawerComponent {
    cartService = inject(CartService);
    router = inject(Router);

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;
    selectedCount = this.cartService.selectedCount;
    allSelected = this.cartService.allSelected;

    isOpen = computed(() => this.cartService.isDrawerOpen());

    toggleSelection(id: number) {
        this.cartService.toggleSelection(id);
    }

    toggleAll(checked: boolean) {
        this.cartService.toggleAll(checked);
    }

    close() {
        this.cartService.closeDrawer();
    }

    checkout() {
        this.cartService.closeDrawer();
        this.router.navigate(['/checkout']);
    }

    goToCart() {
        this.cartService.closeDrawer();
        this.router.navigate(['/cart']);
    }

    updateQuantity(productId: number, quantity: number) {
        this.cartService.updateQuantity(productId, quantity);
    }

    onQuantityChange(productId: number, event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        const newQuantity = parseInt(selectElement.value, 10);
        if (!isNaN(newQuantity)) {
            this.updateQuantity(productId, newQuantity);
        }
    }

    removeItem(productId: number) {
        this.cartService.removeFromCart(productId);
    }
}
