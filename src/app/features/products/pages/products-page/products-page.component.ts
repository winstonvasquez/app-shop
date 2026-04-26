import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';
import { SearchService } from '@shared/services/search.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { ProductService, FiltrosDisponibles } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';

import {
    DsProductCardComponent,
    DsProduct,
    DsButtonComponent,
    DsStarsComponent,
} from '@shared/ui/ds';

const PAGE_SIZE = 20;

interface ListingCrumb {
    label: string;
    route?: string[];
}

interface ShippingFilter {
    key: 'free' | 'fast' | 'intl';
    label: string;
}

@Component({
    selector: 'app-products-page',
    standalone: true,
    imports: [
        TranslateModule,
        LucideAngularModule,
        DsProductCardComponent,
        DsButtonComponent,
        DsStarsComponent,
    ],
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

    /** Breadcrumb dinámico — Inicio > {Categoría} */
    readonly breadcrumbs = computed<ListingCrumb[]>(() => {
        const catId = this.searchService.categoryId();
        const crumbs: ListingCrumb[] = [{ label: 'Inicio', route: ['/home'] }];
        if (catId !== null) {
            const cat = this.categories().find(c => c.id === catId);
            crumbs.push({ label: cat?.nombre ?? 'Productos' });
        } else {
            crumbs.push({ label: 'Productos' });
        }
        return crumbs;
    });

    categories  = signal<CategoryResponse[]>([]);
    sortBy      = signal<string | null>(null);
    minRating   = signal<number | null>(null);
    showNew     = signal<boolean>(false);

    precioMin           = signal<number | null>(null);
    precioMax           = signal<number | null>(null);
    marcasSeleccionadas = signal<string[]>([]);
    enviosSeleccionados = signal<ShippingFilter['key'][]>([]);
    filtrosDisponibles  = signal<FiltrosDisponibles | null>(null);
    showFilterPanel     = signal<boolean>(false);
    viewMode            = signal<'grid' | 'list'>('grid');

    currentPage   = signal(1);
    readonly pageSize = PAGE_SIZE;

    products      = signal<DsProduct[]>([]);
    totalPages    = signal(0);
    totalElements = signal(0);
    loading       = signal(false);

    readonly shippingOpts: ShippingFilter[] = [
        { key: 'free', label: 'Envío gratis' },
        { key: 'fast', label: 'Llega mañana' },
        { key: 'intl', label: 'Internacional' },
    ];

    readonly ratingOpts = [5, 4, 3];

    /** Chips de filtros activos para mostrar arriba del grid. */
    readonly activeChips = computed<{ key: string; label: string; clear: () => void }[]>(() => {
        const chips: { key: string; label: string; clear: () => void }[] = [];
        const catId = this.searchService.categoryId();
        if (catId !== null) {
            const c = this.categories().find(x => x.id === catId);
            if (c) chips.push({ key: 'cat', label: c.nombre, clear: () => this.clearCategory() });
        }
        for (const m of this.marcasSeleccionadas()) {
            chips.push({ key: 'marca-' + m, label: m, clear: () => this.toggleMarca(m) });
        }
        const pMin = this.precioMin(), pMax = this.precioMax();
        if (pMin !== null || pMax !== null) {
            chips.push({
                key: 'price',
                label: `S/ ${pMin ?? 0}–S/ ${pMax ?? '∞'}`,
                clear: () => { this.precioMin.set(null); this.precioMax.set(null); this.goToPage(1); },
            });
        }
        for (const e of this.enviosSeleccionados()) {
            const opt = this.shippingOpts.find(s => s.key === e);
            if (opt) chips.push({ key: 'envio-' + e, label: opt.label, clear: () => this.toggleEnvio(e) });
        }
        if (this.minRating() !== null) {
            chips.push({
                key: 'rating',
                label: `${this.minRating()}★ y más`,
                clear: () => { this.minRating.set(null); this.goToPage(1); },
            });
        }
        return chips;
    });

    readonly resultsLabel = computed(() => {
        const total = this.totalElements();
        return total === 1 ? '1 resultado' : `${total.toLocaleString('es-PE')} resultados`;
    });

    readonly sortLabel = computed(() => {
        const s = this.sortBy();
        if (s === 'sales')  return 'Más vendidos';
        if (s === 'rating') return 'Mejor valorados';
        if (s === 'price-asc') return 'Menor precio';
        if (s === 'price-desc') return 'Mayor precio';
        return 'Más relevantes';
    });

    /** Páginas a renderizar en el control de paginación: 1 ‹ ... › last */
    readonly pageNumbers = computed<(number | '…')[]>(() => {
        const total = this.totalPages();
        const cur = this.currentPage();
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const out: (number | '…')[] = [1];
        const start = Math.max(2, cur - 1);
        const end = Math.min(total - 1, cur + 1);
        if (start > 2) out.push('…');
        for (let i = start; i <= end; i++) out.push(i);
        if (end < total - 1) out.push('…');
        out.push(total);
        return out;
    });

    ngOnInit() {
        this.categoryService.getAllSimple().subscribe(cats => {
            this.categories.set(cats);
            this.loadFiltrosDisponibles();
        });

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
            error: () => { /* no crítico */ },
        });
    }

    toggleMarca(marca: string): void {
        const current = this.marcasSeleccionadas();
        this.marcasSeleccionadas.set(
            current.includes(marca) ? current.filter(m => m !== marca) : [...current, marca]
        );
        this.goToPage(1);
    }

    toggleEnvio(key: ShippingFilter['key']): void {
        const current = this.enviosSeleccionados();
        this.enviosSeleccionados.set(
            current.includes(key) ? current.filter(k => k !== key) : [...current, key]
        );
        this.goToPage(1);
    }

    setRating(r: number): void {
        this.minRating.set(this.minRating() === r ? null : r);
        this.goToPage(1);
    }

    setSort(value: string): void {
        this.sortBy.set(value || null);
        this.goToPage(1);
    }

    onPriceMinInput(value: string): void { this.precioMin.set(value ? Number(value) : null); }
    onPriceMaxInput(value: string): void { this.precioMax.set(value ? Number(value) : null); }
    applyPriceFilter(): void { this.goToPage(1); }

    setView(mode: 'grid' | 'list'): void { this.viewMode.set(mode); }

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

        const sortConfig =
            sort === 'sales'      ? { field: 'salesCount',     direction: 'desc' as const } :
            sort === 'rating'     ? { field: 'rating',         direction: 'desc' as const } :
            sort === 'price-asc'  ? { field: 'precioBase',     direction: 'asc'  as const } :
            sort === 'price-desc' ? { field: 'precioBase',     direction: 'desc' as const } :
            isNew                 ? { field: 'fechaCreacion',  direction: 'desc' as const } :
            undefined;

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
                    minRating: rating ?? undefined,
                }
            ).subscribe({
                next: (data) => {
                    this.products.set(data.content.map(p => this.mapProduct(p)));
                    this.totalPages.set(data.totalPages ?? 1);
                    this.totalElements.set(data.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => this.loading.set(false),
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
            error: () => this.loading.set(false),
        });
    }

    private mapProduct(p: ProductResponse): DsProduct {
        const principal = p.imagenes?.find((img: { esPrincipal?: boolean }) => !!img.esPrincipal);
        const image = principal?.url || p.imagenes?.[0]?.url;
        return {
            id: p.id,
            name: p.nombre,
            now: p.precioBase,
            was: p.originalPrice,
            rating: p.rating,
            sold: p.salesCount,
            stock: p.stock,
            badge: p.badge ?? (p.discount ? p.discount : (p.stock !== undefined && p.stock <= 5 ? 'POCAS' : undefined)),
            tag: p.starSeller ? 'Recomendado' : undefined,
            shipFree: (p.precioBase ?? 0) >= 99,
            image,
        };
    }

    onCardClick(p: DsProduct): void {
        this.router.navigate(['/products', p.id]);
    }

    onAddToCart(_p: DsProduct): void {
        // El cart-drawer del layout reaccionará vía CartService cuando se conecte aquí.
    }

    goToPage(page: number) {
        this.currentPage.set(page);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page },
            queryParamsHandling: 'merge',
        });
        this.loadProducts(page);
    }

    prevPage() { if (this.currentPage() > 1)             this.goToPage(this.currentPage() - 1); }
    nextPage() { if (this.currentPage() < this.totalPages()) this.goToPage(this.currentPage() + 1); }

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
        this.enviosSeleccionados.set([]);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page: 1 },
            queryParamsHandling: 'replace',
        });
        this.loadProducts(1);
    }
}
