import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, effect, untracked,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductCardComponent, Product as UIProduct } from '@shared/components/product-card/product-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { ProductService } from '@core/services/product.service';
import { SearchService } from '@shared/services/search.service';

const FEATURED_COUNT = 10;

@Component({
  selector: 'app-flash-deals-section',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, TranslateModule, RouterLink],
  templateUrl: './flash-deals-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashDealsSectionComponent {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  private productService = inject(ProductService);
  searchService = inject(SearchService);

  products    = signal<UIProduct[]>([]);
  currentPage = signal(0);
  pageSize    = signal(24);
  loading     = signal(false);
  hasMore     = signal(true);

  featuredProducts  = computed(() => this.products().slice(0, FEATURED_COUNT));
  remainingProducts = computed(() => this.products().slice(FEATURED_COUNT));

  constructor() {
    // Recargar cuando cambia búsqueda O categoría
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

  loadProducts(searchQuery?: string, categoryId?: number | null) {
    if (this.loading() || !this.hasMore()) return;

    const query = searchQuery  ?? this.searchService.searchQuery();
    const catId = categoryId !== undefined ? categoryId : this.searchService.categoryId();

    this.loading.set(true);
    this.productService.getAllCachedFiltered(
      this.currentPage(), this.pageSize(), query || undefined, catId
    ).subscribe({
      next: (page) => {
        const offset = this.products().length;
        const newProducts = page.content.map((p, i) => ({
          id:       p.id,
          name:     p.nombre,
          price:    p.precioBase,
          image:    p.imagenes?.find(img => img.esPrincipal)?.url
                    || p.imagenes?.[0]?.url
                    || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          badge:    p.stock !== undefined && p.stock <= 5 ? 'CASI_AGOTADO' : undefined,
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
