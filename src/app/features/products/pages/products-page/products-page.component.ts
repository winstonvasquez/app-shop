import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';
import { SearchService } from '@shared/services/search.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { ProductService, FiltrosDisponibles } from '@core/services/product.service';
import { CartService } from '@features/cart/services/cart.service';
import { PAGINATION } from '@shared/constants/app.constants';
import { CatalogSelectComponent } from '@shared/components';
import { mapearProductoADsProduct } from '@shared/ui/ds';
import {
    ChipDeFiltro,
    OpcionDeEnvio,
    construirConsultaCatalogo,
    describirFiltrosActivos,
} from './catalogo.params';

import {
    DsProductCardComponent,
    DsProduct,
    DsButtonComponent,
    DsStarsComponent,
    DsProductRowComponent,
} from '@shared/ui/ds';

const PAGE_SIZE = 20;

interface ListingCrumb {
    label: string;
    route?: string[];
}

@Component({
    selector: 'app-products-page',
    standalone: true,
    imports: [
        RouterLink,
        FormsModule,
        TranslateModule,
        LucideAngularModule,
        DsProductCardComponent,
        DsProductRowComponent,
        DsButtonComponent,
        DsStarsComponent,
        CatalogSelectComponent,
    ],
    templateUrl: './products-page.component.html',
})
export class ProductsPageComponent implements OnInit {
    private categoryService = inject(CategoryService);
    private route           = inject(ActivatedRoute);
    private router          = inject(Router);
    private productService  = inject(ProductService);
    private analyticsService = inject(AnalyticsService);
    private cartService     = inject(CartService);
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
    enviosSeleccionados = signal<OpcionDeEnvio['key'][]>([]);
    filtrosDisponibles  = signal<FiltrosDisponibles | null>(null);
    showFilterPanel     = signal<boolean>(false);
    viewMode            = signal<'grid' | 'list'>('grid');

    currentPage   = signal(1);
    readonly pageSize = PAGE_SIZE;

    products      = signal<DsProduct[]>([]);
    totalPages    = signal(0);
    totalElements = signal(0);
    loading       = signal(false);

    readonly shippingOpts: OpcionDeEnvio[] = [
        { key: 'free', label: 'Envío gratis' },
        { key: 'fast', label: 'Llega mañana' },
        { key: 'intl', label: 'Internacional' },
    ];

    readonly ratingOpts = [5, 4, 3];

    /** Chips de filtros activos para mostrar arriba del grid. */
    readonly activeChips = computed<ChipDeFiltro[]>(() => describirFiltrosActivos(
        {
            categoriaId: this.searchService.categoryId(),
            categorias: this.categories(),
            marcas: this.marcasSeleccionadas(),
            precioMin: this.precioMin(),
            precioMax: this.precioMax(),
            envios: this.enviosSeleccionados(),
            opcionesDeEnvio: this.shippingOpts,
            calificacionMinima: this.minRating(),
        },
        {
            quitarCategoria: () => this.clearCategory(),
            alternarMarca: (m) => this.toggleMarca(m),
            limpiarPrecio: () => {
                this.precioMin.set(null);
                this.precioMax.set(null);
                this.goToPage(PAGINATION.defaultPage);
            },
            alternarEnvio: (e) => this.toggleEnvio(e),
            limpiarCalificacion: () => { this.minRating.set(null); this.goToPage(1); },
        },
    ));

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
        this.categoryService.getAllSimple().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(cats => {
            this.categories.set(cats);
            this.loadFiltrosDisponibles();
        });

        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['sort'])       this.sortBy.set(params['sort']);
            if (params['rating'])     this.minRating.set(Number(params['rating']));
            if (params['new'])        this.showNew.set(params['new'] === 'true');
            if (params['categoryId']) this.searchService.setCategoryId(Number(params['categoryId']));
            const page = params['page'] ? Number(params['page']) : PAGINATION.defaultPage;
            this.currentPage.set(page);
            this.loadProducts(page);
        });
    }

    loadFiltrosDisponibles(): void {
        const catId = this.searchService.categoryId();
        this.productService.getFiltrosDisponibles(catId ?? undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

    toggleEnvio(key: OpcionDeEnvio['key']): void {
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
        if (value === '__placeholder__') return;     // option disabled, no debería llegar pero defensivo
        this.sortBy.set(value || null);
        this.goToPage(1);
    }

    onPriceMinInput(value: string): void { this.precioMin.set(value ? Number(value) : null); }
    onPriceMaxInput(value: string): void { this.precioMax.set(value ? Number(value) : null); }
    applyPriceFilter(): void { this.goToPage(1); }

    /** Tope de referencia del slider visual: mayor precio visible (mín. S/1000). */
    readonly precioTope = computed(() => {
        const max = this.products().reduce((m, p) => Math.max(m, p.now ?? 0), 0);
        return max > 0 ? max : 1000;
    });

    /** Posiciones (%) del relleno y los handles según el rango min/máx seleccionado. */
    readonly priceSlider = computed(() => {
        const tope = this.precioTope();
        const pct = (v: number) => Math.max(0, Math.min(100, (v / tope) * 100));
        const left = pct(this.precioMin() ?? 0);
        const right = pct(this.precioMax() ?? tope);
        return { left: left + '%', right: right + '%', width: Math.max(0, right - left) + '%' };
    });

    setView(mode: 'grid' | 'list'): void { this.viewMode.set(mode); }

    loadProducts(page: number = this.currentPage()) {
        this.loading.set(true);
        const catId = this.searchService.categoryId();
        const { usarFiltrado, sort, filter } = construirConsultaCatalogo({
            categoriaId: catId,
            busqueda: this.searchService.searchQuery(),
            marcas: this.marcasSeleccionadas(),
            precioMin: this.precioMin(),
            precioMax: this.precioMax(),
            orden: this.sortBy(),
            calificacionMinima: this.minRating(),
            soloNuevos: this.showNew(),
        });
        const busqueda = filter.search;

        if (usarFiltrado) {
            this.productService.getAllProductsFiltered(
                { page: page - 1, size: this.pageSize, sort },
                filter,
            ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (data) => {
                    this.products.set(data.content.map(p => mapearProductoADsProduct(p)));
                    this.totalPages.set(data.totalPages ?? 1);
                    this.totalElements.set(data.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => this.loading.set(false),
            });
            return;
        }

        this.productService.getAllCachedFiltered(page - 1, this.pageSize, busqueda, catId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
                this.products.set(data.content.map(p => mapearProductoADsProduct(p)));
                this.totalPages.set(data.totalPages ?? 1);
                this.totalElements.set(data.totalElements ?? 0);
                this.loading.set(false);
                if (busqueda) {
                    this.analyticsService.trackSearch(busqueda, data.totalElements ?? 0);
                }
            },
            error: () => this.loading.set(false),
        });
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
            queryParams: { page: PAGINATION.defaultPage },
            queryParamsHandling: 'replace',
        });
        this.loadProducts(1);
    }
}
