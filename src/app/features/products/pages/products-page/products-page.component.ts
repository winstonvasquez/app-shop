import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';
import { SearchService } from '@shared/services/search.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { ProductService } from '@core/services/product.service';
import { ProductCardComponent, Product as UIProduct } from '@shared/components/product-card/product-card.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ProductCardComponent, BreadcrumbComponent],
  templateUrl: './products-page.component.html',
})
export class ProductsPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private productService  = inject(ProductService);
  private analyticsService = inject(AnalyticsService);
  public  searchService   = inject(SearchService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Productos' }
  ];

  categories  = signal<CategoryResponse[]>([]);
  sortBy      = signal<string | null>(null);
  minRating   = signal<number | null>(null);
  showNew     = signal<boolean>(false);

  currentPage  = signal(1);
  readonly pageSize = PAGE_SIZE;

  products     = signal<UIProduct[]>([]);
  totalPages   = signal(0);
  totalElements = signal(0);
  loading      = signal(false);

  ngOnInit() {
    this.categoryService.getAllSimple().subscribe(cats => this.categories.set(cats));

    this.route.queryParams.subscribe(params => {
      if (params['sort'])       this.sortBy.set(params['sort']);
      if (params['rating'])     this.minRating.set(Number(params['rating']));
      if (params['new'])        this.showNew.set(params['new'] === 'true');
      if (params['categoryId']) this.searchService.setCategoryId(Number(params['categoryId']));
      const page = params['page'] ? Number(params['page']) : 1;
      this.currentPage.set(page);
      this.loadProducts(page);
    });
  }

  loadProducts(page: number = this.currentPage()) {
    this.loading.set(true);
    const catId = this.searchService.categoryId();
    const query = this.searchService.searchQuery();
    this.productService.getAllCachedFiltered(page - 1, this.pageSize, query || undefined, catId).subscribe({
      next: (data) => {
        const mapped: UIProduct[] = data.content.map(p => ({
          id:    p.id,
          name:  p.nombre,
          price: p.precioBase,
          image: p.imagenes?.find(img => img.esPrincipal)?.url
                 || p.imagenes?.[0]?.url
                 || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          badge: p.stock !== undefined && p.stock <= 5 ? 'CASI_AGOTADO' : undefined
        }));
        this.products.set(mapped);
        this.totalPages.set(data.totalPages ?? 1);
        this.totalElements.set(data.totalElements ?? 0);
        this.loading.set(false);
        if (query) {
          this.analyticsService.trackSearch(query, data.totalElements ?? 0);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge'
    });
    this.loadProducts(page);
  }

  prevPage() {
    if (this.currentPage() > 1) this.goToPage(this.currentPage() - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.goToPage(this.currentPage() + 1);
  }

  selectCategory(id: number): void {
    const current = this.searchService.categoryId();
    this.searchService.setCategoryId(current === id ? null : id);
    this.goToPage(1);
  }

  clearCategory(): void {
    this.searchService.setCategoryId(null);
    this.goToPage(1);
  }

  clearFilters(): void {
    this.searchService.setCategoryId(null);
    this.searchService.setSearchQuery('');
    this.sortBy.set(null);
    this.minRating.set(null);
    this.showNew.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'replace'
    });
    this.loadProducts(1);
  }
}
