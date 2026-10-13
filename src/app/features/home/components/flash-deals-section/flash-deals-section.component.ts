import {
    Component, inject, signal, computed,
    ChangeDetectionStrategy, effect, untracked,
    ViewChild, ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

import { ProductService } from '@core/services/product.service';
import { SearchService } from '@shared/services/search.service';
import { CartService } from '@features/cart/services/cart.service';
import { DsProductCardComponent, DsProduct } from '@shared/ui/ds';
import { mapearProductoADsProduct } from '@shared/ui/ds';

const FEATURED_COUNT = 10;
/** Tarjetas por página que se anuncian como oferta relámpago, y horas que dice el contador. */
const FLASH_COUNT = 3;
const FLASH_HORAS = 18;

@Component({
    selector: 'app-flash-deals-section',
    standalone: true,
    imports: [DsProductCardComponent, TranslateModule, LucideAngularModule],
    templateUrl: './flash-deals-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashDealsSectionComponent {
    @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

    private productService = inject(ProductService);
    private router = inject(Router);
    private cartService = inject(CartService);
    searchService = inject(SearchService);

    products    = signal<DsProduct[]>([]);
    currentPage = signal(0);
    pageSize    = signal(24);
    loading     = signal(false);
    hasMore     = signal(true);

    featuredProducts  = computed(() => this.products().slice(0, FEATURED_COUNT));
    remainingProducts = computed(() => this.products().slice(FEATURED_COUNT));

    constructor() {
        effect(() => {
            const query = this.searchService.searchQuery();
            const catId = this.searchService.categoryId();
            untracked(() => {
                this.products.set([]);
                this.currentPage.set(0);
                this.hasMore.set(true);
                this.loadProducts(query, catId);
            });
        });
    }

    scroll(direction: number): void {
        this.scrollContainer?.nativeElement.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }

    onCardClick(p: DsProduct): void {
        this.router.navigate(['/products', p.id]);
    }

    onAddToCart(p: DsProduct): void {
        this.cartService.addToCart({
            id: Number(p.id),
            name: p.name,
            price: p.now,
            image: p.image ?? '',
            quantity: 1,
        });
        this.cartService.toggleDrawer();
    }

    loadProducts(searchQuery?: string, categoryId?: number | null) {
        if (this.loading() || !this.hasMore()) return;

        const query = searchQuery  ?? this.searchService.searchQuery();
        const catId = categoryId !== undefined ? categoryId : this.searchService.categoryId();

        this.loading.set(true);
        this.productService.getAllCachedFiltered(
            this.currentPage(), this.pageSize(), query || undefined, catId,
        ).subscribe({
            next: (page) => {
                // Las 3 primeras tarjetas de cada página llevan el contador de oferta relámpago.
                const newProducts: DsProduct[] = page.content.map((p, i) => ({
                    ...mapearProductoADsProduct(p),
                    flash: i < FLASH_COUNT ? FLASH_HORAS : undefined,
                }));
                this.products.update(current => [...current, ...newProducts]);
                this.hasMore.set(!page.last);
                this.currentPage.update(p => p + 1);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }
}
