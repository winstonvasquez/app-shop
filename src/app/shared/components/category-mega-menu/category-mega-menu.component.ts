import { Component, inject, signal, computed, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CategoryService } from '@core/services/category.service';
import { UrlEncryptionService } from '@core/services/url-encryption.service';
import { MegaMenuCategoriaDto, MegaMenuProductoItem } from '@core/models/category.model';
import { SearchService } from '@shared/services/search.service';

@Component({
    selector: 'app-category-mega-menu',
    standalone: true,
    imports: [],
    templateUrl: './category-mega-menu.component.html',
    styleUrls: ['./category-mega-menu.component.scss'],
})
export class CategoryMegaMenuComponent implements OnInit {
    private categoryService = inject(CategoryService);
    private router = inject(Router);
    private urlEncryption = inject(UrlEncryptionService);
    private searchService = inject(SearchService);

    /**
     * Si false, oculta el trigger interno "Categorías ▾" del componente.
     * Útil cuando quien lo embebe (ej. main-layout) ya tiene su propio
     * trigger y solo quiere reusar el panel + lógica de carga.
     * Default true (retrocompatible con uso standalone).
     */
    showTrigger = input<boolean>(true);

    isOpen = signal(false);
    isLoading = signal(false);
    categories = signal<MegaMenuCategoriaDto[]>([]);
    activeCategory = signal<MegaMenuCategoriaDto | null>(null);

    activeProducts = computed(() => this.activeCategory()?.productos ?? []);

    ngOnInit() {
        this.loadMegaMenu();
    }

    private loadMegaMenu() {
        if (this.categories().length > 0) return;
        this.isLoading.set(true);
        this.categoryService.getMegaMenu().subscribe({
            next: (data) => {
                this.categories.set(data);
                if (data.length > 0) this.activeCategory.set(data[0]);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    open() { this.isOpen.set(true); }
    close() { this.isOpen.set(false); }
    toggle() { this.isOpen.update(v => !v); }

    selectCategory(cat: MegaMenuCategoriaDto) {
        this.activeCategory.set(cat);
    }

    goToProduct(product: MegaMenuProductoItem) {
        this.close();
        const encryptedId = this.urlEncryption.encrypt(product.id);
        this.router.navigate(['/products', encryptedId]);
    }

    goToCategory(cat: MegaMenuCategoriaDto) {
        this.close();
        if (cat.id === 0) {
            this.router.navigate(['/products']);
        } else {
            this.searchService.setCategoryId(cat.id);
            this.router.navigate(['/products']);
        }
    }

    getProductImage(product: MegaMenuProductoItem): string {
        return product.imagenUrl ?? `https://picsum.photos/seed/prod_${product.id}/300/300`;
    }
}
