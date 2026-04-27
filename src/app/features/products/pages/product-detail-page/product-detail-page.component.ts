import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

import { SeoService } from '@core/services/seo.service';
import { ProductDetailService } from '@features/products/services/product-detail.service';
import { ProductReviewsComponent } from '@features/products/components/product-reviews/product-reviews.component';
import { ProductAttributesComponent } from '@features/products/components/product-attributes/product-attributes.component';
import { Variant } from '@features/products/models/variant.model';
import { CartService } from '@features/cart/services/cart.service';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { Image as ProductImage } from '@features/products/models/image.model';
import { UrlEncryptionService } from '@core/services/url-encryption.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { RecommendationsService } from '@core/services/recommendations.service';

import {
    DsButtonComponent,
    DsBadgeComponent,
    DsStarsComponent,
    DsPriceComponent,
    DsProductCardComponent,
    DsProduct,
} from '@shared/ui/ds';

interface DetailCrumb { label: string; route?: string[]; queryParams?: Record<string, string> }
interface SpecRow { k: string; v: string }
type DetailTab = 'desc' | 'specs' | 'reviews' | 'qa';

@Component({
    selector: 'app-product-detail-page',
    standalone: true,
    imports: [
        TranslateModule,
        LucideAngularModule,
        RouterLink,
        DsButtonComponent,
        DsBadgeComponent,
        DsStarsComponent,
        DsPriceComponent,
        DsProductCardComponent,
        ProductReviewsComponent,
        ProductAttributesComponent,
    ],
    templateUrl: './product-detail-page.component.html',
})
export class ProductDetailPageComponent implements OnInit {
    private productDetailService    = inject(ProductDetailService);
    private cartService             = inject(CartService);
    private recommendationsService  = inject(RecommendationsService);
    private titleService            = inject(Title);
    private route                   = inject(ActivatedRoute);
    private router                  = inject(Router);
    private urlEncryption           = inject(UrlEncryptionService);
    private analytics               = inject(AnalyticsService);
    private seo                     = inject(SeoService);
    private destroyRef              = inject(DestroyRef);

    private _isLoading = signal<boolean>(true);
    private _error     = signal<boolean>(false);
    private _product   = signal<ProductDetail | null>(null);
    similarProducts    = signal<DsProduct[]>([]);

    readonly product   = this._product;
    readonly isLoading = this._isLoading;
    readonly error     = this._error;

    /** Imagen activa de la galería. */
    readonly activeImageIndex = signal<number>(0);
    readonly activeImage = computed<ProductImage | null>(() => {
        const p = this._product();
        return p?.images?.[this.activeImageIndex()] ?? p?.images?.[0] ?? null;
    });

    /** Variant seleccionado (default: primero). */
    readonly selectedVariantId = signal<number | null>(null);
    readonly selectedVariant = computed<Variant | null>(() => {
        const p = this._product();
        const id = this.selectedVariantId();
        if (!p?.variants?.length) return null;
        return p.variants.find(v => v.id === id) ?? p.variants[0];
    });

    readonly qty = signal<number>(1);

    readonly activeTab = signal<DetailTab>('desc');

    readonly breadcrumbs = computed<DetailCrumb[]>(() => {
        const p = this._product();
        if (!p) return [{ label: 'Inicio', route: ['/home'] }, { label: 'Productos', route: ['/products'] }];
        const ext = p as ProductDetail & { categoryName?: string; categoryId?: number };
        const list: DetailCrumb[] = [
            { label: 'Inicio',    route: ['/home'] },
            { label: 'Productos', route: ['/products'] },
        ];
        if (ext.categoryName) {
            list.push({
                label: ext.categoryName,
                route: ['/products'],
                queryParams: { categoryId: String(ext.categoryId ?? '') },
            });
        }
        list.push({ label: p.nombre });
        return list;
    });

    /** Precio efectivo aplicando ajuste del variant. */
    readonly effectivePrice = computed<number>(() => {
        const p = this._product();
        const v = this.selectedVariant();
        if (!p) return 0;
        return v?.precioAjuste ? p.precioBase + v.precioAjuste : p.precioBase;
    });

    /** Stock del variant activo. */
    readonly stock = computed<number>(() => this.selectedVariant()?.stockActual ?? 0);

    /** Specs derivadas — parsea features del backend si vienen como JSON o key-value. */
    readonly specs = computed<SpecRow[]>(() => {
        const p = this._product();
        if (!p) return [];
        const direct: SpecRow[] = [];
        if (p.attributes?.length) {
            for (const a of p.attributes) {
                if (a.nombre && a.valor) direct.push({ k: a.nombre, v: a.valor });
            }
        }
        return direct.slice(0, 8);
    });

    ngOnInit(): void {
        this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const rawId = params['id'];
            const id = this.urlEncryption.decrypt(rawId) ?? rawId;
            this._isLoading.set(true);
            this._error.set(false);
            this._product.set(null);

            this.productDetailService.getProductDetail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (data) => {
                    this._product.set(data);
                    this.activeImageIndex.set(0);
                    this.selectedVariantId.set(data.variants?.[0]?.id ?? null);
                    this.qty.set(1);
                    this.activeTab.set('desc');
                    this._isLoading.set(false);

                    this.seo.setProductPage({
                        nombre: data.nombre,
                        descripcion: (data as unknown as Record<string, unknown>)['descripcion'] as string | undefined,
                        imagen: data.images?.[0]?.url,
                        precio: data.precioBase,
                        marca: (data as unknown as Record<string, unknown>)['marca'] as string | undefined,
                        rating: data.rating,
                    });
                    this.titleService.setTitle(`${data.nombre} | App Shop`);

                    this.saveToBrowseHistory(data);
                    this.analytics.trackProductView(data.id, data.nombre, data.precioBase);
                    this.recommendationsService.trackVisualizacion(data.id);
                    this.recommendationsService.getSimilares(data.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(similares => {
                        this.similarProducts.set(similares.map(p => ({
                            id: p.id,
                            name: p.nombre,
                            now: p.precioBase,
                            rating: p.rating,
                            image: p.imagenes?.find(img => img.esPrincipal)?.url
                                || p.imagenes?.[0]?.url,
                        })));
                    });
                },
                error: () => {
                    this._error.set(true);
                    this._isLoading.set(false);
                },
            });
        });
    }

    selectImage(i: number): void { this.activeImageIndex.set(i); }
    selectVariant(v: Variant): void { this.selectedVariantId.set(v.id); }
    selectTab(t: DetailTab): void { this.activeTab.set(t); }

    incQty(): void { this.qty.update(q => Math.min(q + 1, this.stock() || 99)); }
    decQty(): void { this.qty.update(q => Math.max(1, q - 1)); }

    addToCart(): void {
        const p = this._product();
        const v = this.selectedVariant();
        if (!p || !v) return;
        this.cartService.addToCart({
            id: p.id,
            variantId: v.id,
            sku: v.sku,
            variantName: v.nombre,
            name: p.nombre,
            description: v.nombre,
            price: this.effectivePrice(),
            image: p.images?.[0]?.url ?? '',
            quantity: this.qty(),
            stock: v.stockActual,
        });
        this.cartService.toggleDrawer();
    }

    buyNow(): void {
        this.addToCart();
        this.router.navigate(['/checkout']);
    }

    onSimilarClick(p: DsProduct): void {
        this.router.navigate(['/products', p.id]);
    }

    onSimilarAddToCart(p: DsProduct): void {
        this.cartService.addToCart({
            id: Number(p.id),
            name: p.name,
            price: p.now,
            image: p.image ?? '',
            quantity: 1,
        });
        this.cartService.toggleDrawer();
    }

    private saveToBrowseHistory(product: ProductDetail): void {
        try {
            const history = JSON.parse(localStorage.getItem('browse_history') ?? '[]');
            const item = {
                id: product.id,
                name: product.nombre,
                image: product.images?.[0]?.url ?? '',
                price: product.precioBase,
                slug: (product as unknown as Record<string, unknown>)['slug'] ?? product.id,
            };
            const filtered = history.filter((h: Record<string, unknown>) => h['id'] !== item.id);
            localStorage.setItem('browse_history', JSON.stringify([item, ...filtered].slice(0, 20)));
        } catch {
            /* ignore */
        }
    }
}
