import {
    Component, ChangeDetectionStrategy, input, output,
    signal, inject, OnInit, OnDestroy, AfterViewInit,
    ElementRef, ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ProductoCatalogoPOS } from '../../models/catalogo-pos.model';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { PosFavoritesGridComponent } from '../pos-favorites-grid/pos-favorites-grid.component';
import { PosFavorito } from '../../services/pos-favoritos.service';
import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';
import { ProductService } from '@core/services/product.service';
import { CatalogService } from '@core/services/catalog.service';

export type CatalogView = 'catalogo' | 'favoritos';

/** Filtros avanzados del catálogo POS — TODOS se resuelven en el backend (GET /api/pos/catalogo). */
export interface PosCatalogFiltro {
    categoriaId?: number;
    marca?: string;
    unidadMedida?: string;
    /** 'CON_STOCK' | 'BAJO_MINIMO' | 'SIN_STOCK' — códigos exactos que espera el backend. */
    disponibilidad?: string;
}

@Component({
    selector: 'app-pos-catalog',
    standalone: true,
    imports: [PosFavoritesGridComponent],
    templateUrl: './pos-catalog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCatalogComponent implements OnInit, AfterViewInit, OnDestroy {

    readonly carrito = inject(PosCarritoService);
    private readonly categoryService = inject(CategoryService);
    private readonly productService = inject(ProductService);
    readonly catalog = inject(CatalogService);

    @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

    // ── Inputs ───────────────────────────────────────────────────
    readonly items = input.required<ProductoCatalogoPOS[]>();
    readonly isLoading = input(false);
    readonly isSearching = input(false);
    readonly favoritos = input<PosFavorito[]>([]);
    readonly favoritosLoading = input(false);

    // ── Internal UI State ─────────────────────────────────────────
    readonly activeView = signal<CatalogView>('catalogo');
    readonly searchQuery = signal('');
    /** Categoría seleccionada por id real (la lista de categorías viene del backend, no de los items cargados). */
    readonly selectedCategoriaId = signal<number | null>(null);
    readonly selectedMarca = signal<string | null>(null);
    readonly selectedUnidadMedida = signal<string | null>(null);
    readonly selectedDisponibilidad = signal<string | null>(null);
    readonly categoriasExpandidas = signal(false);   // chips en múltiples líneas
    readonly categoriasPlegadas = signal(false);     // barra completamente oculta

    /** Categorías reales (id + nombre) para el filtro — GET /sales/api/v1/categorias/all. */
    readonly categorias = signal<CategoryResponse[]>([]);
    /** Marcas disponibles para el select — GET /sales/api/v1/productos/filtros-disponibles. */
    readonly marcasDisponibles = signal<string[]>([]);
    /** Unidades de medida — catálogo `UNIDAD_MEDIDA` de erp_parameters. */
    readonly unidadesMedida = this.catalog.options('UNIDAD_MEDIDA');
    /** Disponibilidad de stock: derivada en runtime por el backend (sin catálogo, códigos fijos del contrato). */
    readonly disponibilidadOptions: { value: string; label: string }[] = [
        { value: 'CON_STOCK', label: 'Con stock' },
        { value: 'BAJO_MINIMO', label: 'Bajo mínimo' },
        { value: 'SIN_STOCK', label: 'Sin stock' },
    ];

    // ── Subject para búsqueda reactiva con debounce ───────────────
    readonly searchSubject = new Subject<string>();
    private sub?: Subscription;

    // ── Outputs ───────────────────────────────────────────────────
    readonly productSelected = output<ProductoCatalogoPOS>();
    /** Emite el término de búsqueda (debounceado) para que pos-page llame al backend */
    readonly searchChanged = output<string>();
    /** Emite cualquier cambio de filtro avanzado (categoría/marca/unidad/disponibilidad) — SIEMPRE server-side. */
    readonly filtersChanged = output<PosCatalogFiltro>();
    readonly favoritoSelected = output<PosFavorito>();
    readonly favoritoRemoved = output<PosFavorito>();
    readonly addToFavorites = output<ProductoCatalogoPOS>();
    readonly scanTriggered = output<void>();

    // ── Lifecycle ─────────────────────────────────────────────────
    ngOnInit(): void {
        // 350 ms debounce — filtra typos rápidos pero no bloquea lectores de código
        this.sub = this.searchSubject.pipe(debounceTime(350)).subscribe(q => {
            this.searchQuery.set(q);
            this.searchChanged.emit(q);
        });

        // Categorías reales y marcas disponibles: se cargan una vez, independientes de la página actual.
        this.categoryService.getAllSimple().subscribe({
            next: cats => this.categorias.set(cats),
            error: () => this.categorias.set([]),
        });
        this.productService.getFiltrosDisponibles().subscribe({
            next: f => this.marcasDisponibles.set(f.marcas ?? []),
            error: () => this.marcasDisponibles.set([]),
        });
    }

    ngAfterViewInit(): void {
        // Autofocus al montar el componente para capturar lectores de código de barras
        this.searchInputRef?.nativeElement.focus();
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
        this.searchSubject.complete();
    }

    // ── Actions ───────────────────────────────────────────────────
    onSearch(value: string): void {
        this.searchSubject.next(value);
    }

    /** Enter key handler: dispara búsqueda inmediata (lector de código de barras/QR) */
    onEnterSearch(value: string): void {
        this.searchSubject.next(value);  // fuerza emit aunque debounce no haya disparado
        // flush inmediato: cancela el timer pendiente y emite ya
        this.searchQuery.set(value);
        this.searchChanged.emit(value);
    }

    selectCategoria(categoriaId: number | null, el?: HTMLElement): void {
        this.selectedCategoriaId.set(categoriaId);
        this.emitFilters();
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    onMarcaChange(value: string): void {
        this.selectedMarca.set(value || null);
        this.emitFilters();
    }

    onUnidadMedidaChange(value: string): void {
        this.selectedUnidadMedida.set(value || null);
        this.emitFilters();
    }

    onDisponibilidadChange(value: string): void {
        this.selectedDisponibilidad.set(value || null);
        this.emitFilters();
    }

    /** Emite el estado completo de filtros para que pos-page recargue el catálogo desde el backend. */
    private emitFilters(): void {
        this.filtersChanged.emit({
            categoriaId: this.selectedCategoriaId() ?? undefined,
            marca: this.selectedMarca() ?? undefined,
            unidadMedida: this.selectedUnidadMedida() ?? undefined,
            disponibilidad: this.selectedDisponibilidad() ?? undefined,
        });
    }

    toggleExpandir(): void {
        this.categoriasExpandidas.update(v => !v);
    }

    togglePlegado(): void {
        this.categoriasPlegadas.update(v => !v);
        if (this.categoriasPlegadas()) this.categoriasExpandidas.set(false);
    }

    setView(view: CatalogView): void {
        this.activeView.set(view);
    }

    addToCart(p: ProductoCatalogoPOS): void {
        if (p.stockActual <= 0) return;
        this.productSelected.emit(p);
    }

    onFavoritoSelected(fav: PosFavorito): void {
        this.favoritoSelected.emit(fav);
    }

    onFavoritoRemoved(fav: PosFavorito): void {
        this.favoritoRemoved.emit(fav);
    }

    onAddToFavorites(p: ProductoCatalogoPOS): void {
        this.addToFavorites.emit(p);
    }

    isJustAdded(varianteId: number): boolean {
        return this.carrito.lastAddedId() === varianteId;
    }

    bgColor(id: number): string {
        return 'prod-bg-' + (id % 7);
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
