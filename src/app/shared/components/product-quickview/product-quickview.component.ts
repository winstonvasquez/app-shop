import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickviewService } from '@shared/services/quickview.service';
import { ProductDetailService } from '@features/products/services/product-detail.service';
import { CartService } from '@features/cart/services/cart.service';
import { ProductVariantsComponent } from '@features/products/components/product-variants/product-variants.component';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { Variant } from '@features/products/models/variant.model';

import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-product-quickview',
    standalone: true,
    imports: [CommonModule, ProductVariantsComponent, TranslateModule],
    templateUrl: './product-quickview.component.html'
})
export class ProductQuickviewComponent {
    quickviewService = inject(QuickviewService);
    private productDetailService = inject(ProductDetailService);
    private cartService = inject(CartService);

    product = signal<ProductDetail | null>(null);
    isLoading = signal(false);
    activeImageIndex = signal(0);

    constructor() {
        effect(() => {
            const id = this.quickviewService.productId();
            if (id) {
                this.activeImageIndex.set(0);
                this.loadProduct(id);
            } else {
                this.product.set(null);
            }
        });
    }

    loadProduct(id: number) {
        this.isLoading.set(true);
        this.productDetailService.getProductDetail(id).subscribe({
            next: (data) => {
                this.product.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    close() {
        this.quickviewService.close();
    }

    onAddToCart(event: { variant: Variant, quantity: number }) {
        const prod = this.product();
        if (prod) {
            this.cartService.addToCart({
                id: event.variant.id,
                name: prod.nombre,
                description: event.variant.nombre,
                price: event.variant.precioAjuste || prod.precioBase,
                image: prod.images && prod.images.length > 0 ? prod.images[0].url : '',
                quantity: event.quantity,
                stock: event.variant.stockActual
            });
            this.close();
            this.cartService.openDrawer();
        }
    }

    changeImage(index: number) {
        this.activeImageIndex.set(index);
    }
}
