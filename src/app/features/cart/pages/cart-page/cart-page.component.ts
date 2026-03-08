import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '@features/cart/services/cart.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './cart-page.component.html'
})
export class CartPageComponent implements OnInit {
    cartService = inject(CartService);
    configService = inject(ConfigService);
    router = inject(Router);

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;

    mediosPago = toSignal(this.configService.getMediosPago(), { initialValue: [] as MedioPago[] });
    certificaciones = toSignal(this.configService.getCertificaciones(), { initialValue: [] as Certificacion[] });

    ngOnInit() {
        // Component initialization if needed
    }

    onQuantityChange(productId: number, event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        const newQuantity = parseInt(selectElement.value, 10);
        if (!isNaN(newQuantity)) {
            this.cartService.updateQuantity(productId, newQuantity);
        }
    }

    toggleSelection(id: number) {
        this.cartService.toggleSelection(id);
    }

    toggleAll(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        this.cartService.toggleAll(checked);
    }

    checkout() {
        this.router.navigate(['/checkout']);
    }
}
