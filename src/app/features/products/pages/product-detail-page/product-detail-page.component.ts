import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProductDetailService } from '@features/products/services/product-detail.service';
import { ProductImageGalleryComponent } from '@features/products/components/product-image-gallery/product-image-gallery.component';
import { ProductMainInfoComponent } from '@features/products/components/product-main-info/product-main-info.component';
import { ProductVariantsComponent } from '@features/products/components/product-variants/product-variants.component';
import { ProductReviewsComponent } from '@features/products/components/product-reviews/product-reviews.component';
import { SellerInfoComponent } from '@features/products/components/seller-info/seller-info.component';
import { ProductAttributesComponent } from '@features/products/components/product-attributes/product-attributes.component';
import { Variant } from '@features/products/models/variant.model';
import { CartService } from '@features/cart/services/cart.service';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { UrlEncryptionService } from '@core/services/url-encryption.service';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    ProductImageGalleryComponent,
    ProductMainInfoComponent,
    ProductVariantsComponent,
    ProductReviewsComponent,
    SellerInfoComponent,
    ProductAttributesComponent,
    TranslateModule
  ],
  templateUrl: './product-detail-page.component.html'
})
export class ProductDetailPageComponent implements OnInit {
  private productDetailService = inject(ProductDetailService);
  private cartService = inject(CartService);
  private titleService = inject(Title);
  private route = inject(ActivatedRoute);
  private urlEncryption = inject(UrlEncryptionService);

  private _isLoading = signal<boolean>(true);
  private _error = signal<boolean>(false);
  private _product = signal<ProductDetail | null>(null);

  productResource = {
    isLoading: this._isLoading,
    error: this._error,
    value: this._product
  };

  ngOnInit() {
    this.route.params.subscribe(params => {
      const rawId = params['id'];
      const id = this.urlEncryption.decrypt(rawId) ?? rawId;
      this._isLoading.set(true);
      this._error.set(false);
      this._product.set(null);

      this.productDetailService.getProductDetail(id).subscribe({
        next: (data) => {
          this._product.set(data);
          this._isLoading.set(false);
          this.titleService.setTitle(`${data.nombre} | App Shop`);
        },
        error: () => {
          this._error.set(true);
          this._isLoading.set(false);
        }
      });
    });
  }

  onAddToCart(event: { variant: Variant, quantity: number }) {
    const product = this._product();
    if (product) {
      this.cartService.addToCart({
        id: event.variant.id,
        name: product.nombre,
        description: event.variant.nombre,
        price: event.variant.precioAjuste || product.precioBase,
        image: product.images && product.images.length > 0 ? product.images[0].url : '',
        quantity: event.quantity,
        stock: event.variant.stockActual
      });
      this.cartService.toggleDrawer();
    }
  }
}
