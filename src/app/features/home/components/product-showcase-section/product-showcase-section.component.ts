import {
    Component, input, signal, computed, inject, OnInit,
    ChangeDetectionStrategy, ViewChild, ElementRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

import { ProductService } from '@core/services/product.service';
import { CartService } from '@features/cart/services/cart.service';
import { DsProductCardComponent, DsProduct } from '@shared/ui/ds';
import { mapearProductoADsProduct } from '@shared/ui/ds';
import { ZonaEnvioService } from '@core/services/zona-envio.service';
import { conEnvioGratis } from '@features/cart/utils/envio-gratis';
import { consultaDeShowcase, ShowcaseType } from '@features/home/utils/showcase.util';

export type { ShowcaseType };

@Component({
    selector: 'app-product-showcase-section',
    standalone: true,
    imports: [DsProductCardComponent, RouterLink, TranslateModule, LucideAngularModule],
    templateUrl: './product-showcase-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductShowcaseSectionComponent implements OnInit {
    @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

    type       = input.required<ShowcaseType>();
    title      = input.required<string>();
    icon       = input<string>('star');
    linkParams = input<Record<string, string>>({});

    private productService = inject(ProductService);
    private router         = inject(Router);
    private cartService    = inject(CartService);

    private zonaEnvio = inject(ZonaEnvioService);
    private productsBase = signal<DsProduct[]>([]);
    products = computed(() => conEnvioGratis(this.productsBase(), this.zonaEnvio.envioGratisDesde()));
    loading  = signal(false);

    ngOnInit() { this.zonaEnvio.cargarUmbral(); this.loadProducts(); }

    scroll(direction: number): void {
        this.scrollContainer?.nativeElement.scrollBy({ left: direction * 300, behavior: 'smooth' });
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

    private loadProducts() {
        this.loading.set(true);
        const { sort, filter, badgeDeSeccion } = consultaDeShowcase(this.type());

        this.productService.getAllProductsFiltered(
            { page: 0, size: 12, sort },
            filter,
        ).subscribe({
            next: (page) => {
                this.productsBase.set(page.content.map(p => mapearProductoADsProduct(p, { badgeDeSeccion })));
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }
}
