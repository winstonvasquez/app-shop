import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

import { FlashDealsSectionComponent } from '@features/home/components/flash-deals-section/flash-deals-section.component';
import { ProductShowcaseSectionComponent } from '@features/home/components/product-showcase-section/product-showcase-section.component';
import { DsButtonComponent, DsBadgeComponent, DsCategoryTileComponent, DsCategoryTile } from '@shared/ui/ds';

import { CategoryService } from '@core/services/category.service';
import { BannerService, Banner } from '@features/home/services/banner.service';
import { SearchService } from '@shared/services/search.service';

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [
        TranslateModule,
        LucideAngularModule,
        FlashDealsSectionComponent,
        ProductShowcaseSectionComponent,
        DsButtonComponent,
        DsBadgeComponent,
        DsCategoryTileComponent,
    ],
    templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
    private categoryService = inject(CategoryService);
    private bannerService   = inject(BannerService);
    private router          = inject(Router);
    public  searchService   = inject(SearchService);

    /** Categorías reales mapeadas al shape DS (`name`, `count`, `image`, `tone`). */
    readonly categories = signal<DsCategoryTile[]>([]);
    readonly heroBanner = signal<Banner | null>(null);

    /** Bullets de confianza — patrón "trust strip" del DS. */
    readonly trustItems = [
        { icon: 'truck',  title: 'Envío gratis',      sub: 'Desde S/ 99' },
        { icon: 'shield', title: 'Compra protegida',  sub: 'Garantía 30 días' },
        { icon: 'zap',    title: 'Entrega rápida',    sub: '24h en Lima' },
        { icon: 'lock',   title: 'Pago seguro',       sub: 'PCI DSS · Yape' },
    ];

    /** Cuenta regresiva del strip de flash deals — re-render cada minuto. */
    private now = signal<Date>(new Date());
    readonly flashTime = computed(() => {
        const d = this.now();
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        const diff = Math.max(0, end.getTime() - d.getTime());
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1000);
        return [pad(h), pad(m), pad(s)];
    });

    ngOnInit(): void {
        this.loadData();
        setInterval(() => this.now.set(new Date()), 1000);
    }

    onHeroCta(): void {
        // Sin vista dedicada de "ofertas" todavía; mejor proxy: catálogo
        // ordenado por descuento. products-page lee queryParams.sort.
        this.router.navigate(['/products'], { queryParams: { sort: 'descuento,desc' } });
    }

    onHeroSecondary(): void {
        // Sin vista dedicada de "categorías"; el catálogo ya muestra el panel
        // de categorías como filtro lateral.
        this.router.navigate(['/products']);
    }

    onCategoryClick(c: DsCategoryTile): void {
        const original = this.categoriesRaw().find(x => x.nombre === c.name);
        if (original) this.searchService.setCategoryId(original.id);
        this.router.navigate(['/products']);
    }

    private categoriesRaw = signal<{ id: number; nombre: string }[]>([]);

    private loadData(): void {
        this.categoryService.getAllSimple().subscribe((cats: { id: number; nombre: string; imagenUrl?: string }[]) => {
            this.categoriesRaw.set(cats);
            this.categories.set(
                cats.slice(0, 8).map((c, i) => ({
                    name: c.nombre,
                    image: c.imagenUrl,
                    tone: i,
                })),
            );
        });

        this.bannerService.getAll().subscribe({
            next: (banners: Banner[]) => {
                this.heroBanner.set(banners[0] ?? null);
            },
            error: () => this.heroBanner.set(null),
        });
    }
}

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}
