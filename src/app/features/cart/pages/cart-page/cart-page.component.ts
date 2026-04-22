import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '@features/cart/services/cart.service';
import { ConfigService, MedioPago, Certificacion } from '@core/services/config.service';
import { TranslateModule } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [
    TranslateModule,
    BreadcrumbComponent,
    DecimalPipe,
  ],
    templateUrl: './cart-page.component.html'
})
export class CartPageComponent implements OnInit {
    cartService = inject(CartService);
    configService = inject(ConfigService);
    router = inject(Router);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Carrito' }
    ];

    cartItems = this.cartService.cartItems;
    cartTotal = this.cartService.cartTotal;

    mediosPago = toSignal(this.configService.getMediosPago(), { initialValue: [] as MedioPago[] });
    certificaciones = toSignal(this.configService.getCertificaciones(), { initialValue: [] as Certificacion[] });

    isCheckingOut = signal(false);

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
        if (this.isCheckingOut()) return;
        this.isCheckingOut.set(true);
        this.router.navigate(['/checkout']).finally(() => {
            this.isCheckingOut.set(false);
        });
    }
}
