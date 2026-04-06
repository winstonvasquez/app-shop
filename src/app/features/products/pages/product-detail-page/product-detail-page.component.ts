import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
import { AnalyticsService } from '@core/services/analytics.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

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
    TranslateModule,
    BreadcrumbComponent
  ],
  templateUrl: './product-detail-page.component.html'
})
export class ProductDetailPageComponent implements OnInit {
  private productDetailService = inject(ProductDetailService);
  private cartService = inject(CartService);
  private titleService = inject(Title);
  private route = inject(ActivatedRoute);
  private urlEncryption = inject(UrlEncryptionService);
  private analytics = inject(AnalyticsService);

  private _isLoading = signal<boolean>(true);
  private _error = signal<boolean>(false);
  private _product = signal<ProductDetail | null>(null);

  productResource = {
    isLoading: this._isLoading,
    error: this._error,
    value: this._product
  };

  breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const p = this._product();
    if (!p) return [
      { label: 'Inicio', route: ['/home'] },
      { label: 'Productos', route: ['/products'] }
    ];
    const extended = p as ProductDetail & { categoryName?: string; categoryId?: number };
    return [
      { label: 'Inicio', route: ['/home'] },
      { label: 'Productos', route: ['/products'] },
      ...(extended.categoryName
        ? [{ label: extended.categoryName, route: ['/products'], queryParams: { categoryId: String(extended.categoryId ?? '') } }]
        : []),
      { label: p.nombre }
    ];
  });

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
          this.saveToBrowseHistory(data);
          this.analytics.trackProductView(data.id, data.nombre, data.precioBase);
        },
        error: () => {
          this._error.set(true);
          this._isLoading.set(false);
        }
      });
    });
  }

  private saveToBrowseHistory(product: ProductDetail): void {
    try {
      const history = JSON.parse(localStorage.getItem('browse_history') || '[]');
      const item = {
        id: product.id,
        name: product.nombre,
        image: product.images && product.images.length > 0 ? product.images[0].url : '',
        price: product.precioBase,
        slug: (product as unknown as Record<string, unknown>)['slug'] ?? product.id
      };
      const filtered = history.filter((h: Record<string, unknown>) => h['id'] !== item.id);
      localStorage.setItem('browse_history', JSON.stringify([item, ...filtered].slice(0, 20)));
    } catch {
      // Ignorar errores de localStorage
    }
  }

  onAddToCart(event: { variant: Variant, quantity: number }) {
    const product = this._product();
    if (product) {
      this.cartService.addToCart({
        id: product.id,
        variantId: event.variant.id,
        sku: event.variant.sku,
        variantName: event.variant.nombre,
        name: product.nombre,
        description: event.variant.nombre,
        price: event.variant.precioAjuste ? product.precioBase + event.variant.precioAjuste : product.precioBase,
        image: product.images && product.images.length > 0 ? product.images[0].url : '',
        quantity: event.quantity,
        stock: event.variant.stockActual
      });
      this.cartService.toggleDrawer();
    }
  }
}
