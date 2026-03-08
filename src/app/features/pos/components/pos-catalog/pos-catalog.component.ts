import {
    Component, ChangeDetectionStrategy, input, output,
    signal, computed, inject, OnInit, OnDestroy, AfterViewInit,
    ElementRef, ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ProductoCatalogoPOS } from '../../models/catalogo-pos.model';
import { PosCarritoService } from '../../services/pos-carrito.service';

@Component({
    selector: 'app-pos-catalog',
    standalone: true,
    templateUrl: './pos-catalog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCatalogComponent implements OnInit, AfterViewInit, OnDestroy {

    readonly carrito = inject(PosCarritoService);

    @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

    // ── Inputs ───────────────────────────────────────────────────
    readonly items = input.required<ProductoCatalogoPOS[]>();
    readonly isLoading = input(false);
    readonly isSearching = input(false);

    // ── Internal UI State ─────────────────────────────────────────
    readonly searchQuery = signal('');
    readonly selectedCategoria = signal<string | null>(null);
    readonly categoriasExpandidas = signal(false);   // chips en múltiples líneas
    readonly categoriasPlegadas = signal(false);     // barra completamente oculta

    // ── Subject para búsqueda reactiva con debounce ───────────────
    readonly searchSubject = new Subject<string>();
    private sub?: Subscription;

    // ── Outputs ───────────────────────────────────────────────────
    readonly productSelected = output<ProductoCatalogoPOS>();
    /** Emite el término de búsqueda (debounceado) para que pos-page llame al backend */
    readonly searchChanged = output<string>();

    // ── Computed ──────────────────────────────────────────────────
    readonly categorias = computed(() =>
        [...new Set(this.items().map(p => p.categoria))].sort()
    );

    /**
     * Filtra en memoria por categoría.
     * La búsqueda por texto ya fue delegada al backend via searchChanged output.
     */
    readonly filteredItems = computed(() => {
        const cat = this.selectedCategoria();
        return !cat ? this.items() : this.items().filter(p => p.categoria === cat);
    });

    // ── Lifecycle ─────────────────────────────────────────────────
    ngOnInit(): void {
        // 350 ms debounce — filtra typos rápidos pero no bloquea lectores de código
        this.sub = this.searchSubject.pipe(debounceTime(350)).subscribe(q => {
            this.searchQuery.set(q);
            this.searchChanged.emit(q);
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

    selectCategoria(cat: string | null, el?: HTMLElement): void {
        this.selectedCategoria.set(cat);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    toggleExpandir(): void {
        this.categoriasExpandidas.update(v => !v);
    }

    togglePlegado(): void {
        this.categoriasPlegadas.update(v => !v);
        if (this.categoriasPlegadas()) this.categoriasExpandidas.set(false);
    }

    addToCart(p: ProductoCatalogoPOS): void {
        if (p.stockActual <= 0) return;
        this.productSelected.emit(p);
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
