import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';
import { SearchService } from '@shared/services/search.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { ProductService, FiltrosDisponibles } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';
import { ProductCardComponent, Product as UIProduct } from '@shared/components/product-card/product-card.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [TranslateModule, ProductCardComponent, BreadcrumbComponent],
  templateUrl: './products-page.component.html',
})
export class ProductsPageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private productService  = inject(ProductService);
  private analyticsService = inject(AnalyticsService);
  public  searchService   = inject(SearchService);
  private destroyRef      = inject(DestroyRef);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Productos' }
  ];

  categories  = signal<CategoryResponse[]>([]);
  sortBy      = signal<string | null>(null);
  minRating   = signal<number | null>(null);
  showNew     = signal<boolean>(false);

  // Filtros avanzados (F2.2)
  precioMin         = signal<number | null>(null);
  precioMax         = signal<number | null>(null);
  marcasSeleccionadas = signal<string[]>([]);
  filtrosDisponibles  = signal<FiltrosDisponibles | null>(null);
  showFilterPanel   = signal<boolean>(false);

  currentPage  = signal(1);
  readonly pageSize = PAGE_SIZE;

  products     = signal<UIProduct[]>([]);
  totalPages   = signal(0);
  totalElements = signal(0);
  loading      = signal(false);

  ngOnInit() {
    this.categoryService.getAllSimple().subscribe(cats => this.categories.set(cats));

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['sort'])       this.sortBy.set(params['sort']);
      if (params['rating'])     this.minRating.set(Number(params['rating']));
      if (params['new'])        this.showNew.set(params['new'] === 'true');
      if (params['categoryId']) this.searchService.setCategoryId(Number(params['categoryId']));
      const page = params['page'] ? Number(params['page']) : 1;
      this.currentPage.set(page);
      this.loadProducts(page);
    });
  }

  loadFiltrosDisponibles(): void {
    const catId = this.searchService.categoryId();
    this.productService.getFiltrosDisponibles(catId ?? undefined).subscribe({
      next: (f) => this.filtrosDisponibles.set(f),
      error: () => { /* no crítico */ }
    });
  }

  toggleMarca(marca: string): void {
    const current = this.marcasSeleccionadas();
    this.marcasSeleccionadas.set(
      current.includes(marca) ? current.filter(m => m !== marca) : [...current, marca]
    );
    this.goToPage(1);
  }

  applyPriceFilter(): void { this.goToPage(1); }

  loadProducts(page: number = this.currentPage()) {
    this.loading.set(true);
    const catId = this.searchService.categoryId();
    const query = this.searchService.searchQuery();
    const marcas = this.marcasSeleccionadas();
    const pMin = this.precioMin();
    const pMax = this.precioMax();
    const sort = this.sortBy();
    const rating = this.minRating();
    const isNew = this.showNew();

    // Determinar ordenamiento según filtro activo
    const sortConfig = sort === 'sales'
      ? { field: 'salesCount', direction: 'desc' as const }
      : sort === 'rating'
        ? { field: 'rating', direction: 'desc' as const }
        : isNew
          ? { field: 'fechaCreacion', direction: 'desc' as const }
          : undefined;

    // Usar filtrado avanzado si hay parámetros extra
    const hasAdvanced = marcas.length || pMin != null || pMax != null || sort || rating || isNew;
    if (hasAdvanced) {
      this.productService.getAllProductsFiltered(
        { page: page - 1, size: this.pageSize, sort: sortConfig },
        {
          search: query || undefined,
          categoriaId: catId ?? undefined,
          marcas,
          minPrice: pMin ?? undefined,
          maxPrice: pMax ?? undefined,
          minRating: rating ?? undefined
        }
      ).subscribe({
        next: (data) => {
          this.products.set(data.content.map(p => this.mapProduct(p)));
          this.totalPages.set(data.totalPages ?? 1);
          this.totalElements.set(data.totalElements ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
      return;
    }

    this.productService.getAllCachedFiltered(page - 1, this.pageSize, query || undefined, catId).subscribe({
      next: (data) => {
        this.products.set(data.content.map(p => this.mapProduct(p)));
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

  private mapProduct(p: ProductResponse): UIProduct {
    return {
      id: p.id,
      name: p.nombre,
      price: p.precioBase,
      image: p.imagenes?.find((img: { esPrincipal?: boolean; url: string }) => !!img.esPrincipal)?.url
             || p.imagenes?.[0]?.url
             || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
      rating: p.rating ?? undefined,
      sold: p.salesCount ?? undefined,
      badge: p.stock !== undefined && p.stock <= 5 ? 'CASI_AGOTADO' : undefined
    };
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
    this.marcasSeleccionadas.set([]);
    this.loadFiltrosDisponibles();
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
    this.precioMin.set(null);
    this.precioMax.set(null);
    this.marcasSeleccionadas.set([]);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1 },
      queryParamsHandling: 'replace'
    });
    this.loadProducts(1);
  }
}
