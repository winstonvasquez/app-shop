import { Component, inject, signal, computed, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent, Product as UIProduct } from '@shared/components/product-card/product-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { ProductService } from '@core/services/product.service';
import { SearchService } from '@shared/services/search.service';

/** How many products to show in the horizontal overlay strip */
const FEATURED_COUNT = 10;

@Component({
  selector: 'app-flash-deals-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslateModule],
  templateUrl: './flash-deals-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashDealsSectionComponent {
  private productService = inject(ProductService);
  searchService = inject(SearchService);

  products = signal<UIProduct[]>([]);
  currentPage = signal(0);
  pageSize = signal(24);
  loading = signal(false);
  hasMore = signal(true);

  /** First N products — shown in the horizontal overlay strip */
  featuredProducts = computed(() => this.products().slice(0, FEATURED_COUNT));

  /** Remaining products — shown in the full grid below */
  remainingProducts = computed(() => this.products().slice(FEATURED_COUNT));

  constructor() {
    effect(() => {
      const query = this.searchService.searchQuery();
      // Only searchQuery should trigger this effect
      untracked(() => {
        this.products.set([]);
        this.currentPage.set(0);
        this.hasMore.set(true);
        this.loadProducts(query);
      });
    });
  }

  loadProducts(searchQuery?: string) {
    if (this.loading() || !this.hasMore()) return;

    const query = searchQuery ?? this.searchService.searchQuery();

    this.loading.set(true);
    this.productService.getAllCached(this.currentPage(), this.pageSize(), query).subscribe({
      next: (page) => {
        const offset = this.products().length;
        const newProducts = page.content.map((p, i) => ({
          id: p.id,
          name: p.nombre,
          price: p.precioBase,
          image: p.imagenes?.find(img => img.esPrincipal)?.url || p.imagenes?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          badge: p.stock !== undefined && p.stock <= 5 ? 'CASI_AGOTADO' : undefined,
          // Every 5th card in the strip gets the amber accent variant
          featured: (offset + i) % 5 === 1
        }));

        this.products.update(current => [...current, ...newProducts]);
        this.hasMore.set(!page.last);
        this.currentPage.update(p => p + 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}

