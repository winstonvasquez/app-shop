import {
  Component, input, signal, inject, OnInit,
  ChangeDetectionStrategy, ViewChild, ElementRef
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent, Product as UIProduct } from '@shared/components/product-card/product-card.component';
import { ProductService } from '@core/services/product.service';
import { TranslateModule } from '@ngx-translate/core';

export type ShowcaseType = 'best-sellers' | 'top-rated' | 'new-arrivals';

@Component({
  selector: 'app-product-showcase-section',
  standalone: true,
  imports: [ProductCardComponent, RouterLink, TranslateModule],
  templateUrl: './product-showcase-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductShowcaseSectionComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  type = input.required<ShowcaseType>();
  title = input.required<string>();
  icon = input<string>('star');
  linkParams = input<Record<string, string>>({});

  private productService = inject(ProductService);

  products = signal<UIProduct[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadProducts();
  }

  scroll(direction: number): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: direction * 300, behavior: 'smooth' });
  }

  private loadProducts() {
    this.loading.set(true);
    const type = this.type();

    const sort = type === 'best-sellers'
      ? { field: 'salesCount', direction: 'desc' as const }
      : type === 'top-rated'
        ? { field: 'rating', direction: 'desc' as const }
        : { field: 'fechaCreacion', direction: 'desc' as const };

    const filter = type === 'top-rated' ? { minRating: 4 } : {};

    this.productService.getAllProductsFiltered(
      { page: 0, size: 12, sort },
      filter
    ).subscribe({
      next: (page) => {
        this.products.set(page.content.map(p => ({
          id: p.id,
          name: p.nombre,
          price: p.precioBase,
          image: p.imagenes?.find((img) => img.esPrincipal)?.url
                 || p.imagenes?.[0]?.url
                 || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          rating: p.rating ?? undefined,
          sold: p.salesCount ?? undefined,
          badge: p.stock !== undefined && p.stock <= 5 ? 'CASI_AGOTADO' : undefined
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
