import { Component, inject, OnInit, OnDestroy, computed, signal, ViewChild } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/services/cart.service';
import { ModalStateService } from '@core/services/modal-state.service';
import { ThemeService } from '@core/services/theme/theme';
import { CategoryService } from '@core/services/category.service';

import {
    DsTopBarComponent,
    DsShopHeaderComponent,
    DsShopFooterComponent,
    DsCategory,
} from '@shared/ui/ds';

import { FloatingMenuComponent } from '@shared/components/floating-menu/floating-menu.component';
import { FloatingChatComponent } from '@shared/components/floating-chat/floating-chat.component';
import { CartDrawerComponent } from '@shared/components/cart-drawer/cart-drawer.component';
import { ProductQuickviewComponent } from '@shared/components/product-quickview/product-quickview.component';
import { AuthModal } from '@shared/components/auth-modal/auth-modal.component';
import { ToastContainerComponent } from '@shared/components/toast/toast-container.component';
import { FlashSaleBannerComponent } from '@shared/components/flash-sale-banner/flash-sale-banner.component';
import { CategoryMegaMenuComponent } from '@shared/components/category-mega-menu/category-mega-menu.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [
        RouterOutlet,
        DsTopBarComponent,
        DsShopHeaderComponent,
        DsShopFooterComponent,
        FloatingMenuComponent,
        FloatingChatComponent,
        CartDrawerComponent,
        ProductQuickviewComponent,
        AuthModal,
        ToastContainerComponent,
        FlashSaleBannerComponent,
        CategoryMegaMenuComponent,
    ],
    templateUrl: './main-layout.component.html',
    host: { class: 'block w-full' },
    styles: [`
        /* Wrapper del header + mega-menu para que el hover funcione fluido */
        .header-with-mega { position: relative; }
        /* Anchor del mega-menu — calculo del offset al texto "Categorías":
             - 5%        : margen izquierdo del nav (90% centered)
             - +14px     : padding-left del botón .cats-btn
             - +14px     : ancho del icon layout-grid
             - +6px      : gap entre icon y texto
             = 5% + 34px : posición exacta de la primera letra "C"
           Combinado con left:0 + sin transform en el panel interno → se
           despliega desde "C" hacia la derecha. */
        .mega-anchor {
            position: absolute;
            top: 100%;
            left: calc(5% + 34px);
            z-index: 200;
        }
    `],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
    modalState = inject(ModalStateService);

    @ViewChild('megaMenu') megaMenu?: CategoryMegaMenuComponent;

    private authService = inject(AuthService);
    private cartService = inject(CartService);
    private router = inject(Router);
    private themeService = inject(ThemeService);
    private categoryService = inject(CategoryService);
    private navSub?: Subscription;
    private hoverCloseTimer?: ReturnType<typeof setTimeout>;

    /**
     * Categorías top — alimentan el `<ds-category-nav>` del header.
     *
     * Estructura: [shortcuts estáticos] + [TOP-7 categorías reales del backend]
     * + [accent ofertas] + [vender]. Las rutas usan parámetros REALES soportados
     * por products-page (`sort`, `categoryId`).
     */
    readonly headerCategories = signal<DsCategory[]>([
        { label: 'Más vendidos',    route: '/products?sort=salesCount,desc' },
        { label: 'Ofertas del día', route: '/products?sort=descuento,desc', highlight: true },
        { label: 'Vender',          route: '/info/vender' },
    ]);

    cartCount = this.cartService.cartCount;
    isAuthenticated = this.authService.isAuthenticated;
    userName = computed(() => this.authService.currentUser()?.username ?? '');

    ngOnInit(): void {
        this.themeService.setContext('shop');
        this.navSub = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        this.loadHeaderCategories();
    }

    private loadHeaderCategories(): void {
        this.categoryService.getAllSimple().subscribe({
            next: (cats) => {
                const real: DsCategory[] = cats.slice(0, 7).map(c => ({
                    label: c.nombre,
                    route: `/products?categoryId=${c.id}`,
                }));
                // Mantenemos los shortcuts estáticos al inicio y final
                this.headerCategories.set([
                    { label: 'Más vendidos',    route: '/products?sort=salesCount,desc' },
                    ...real,
                    { label: 'Ofertas del día', route: '/products?sort=descuento,desc', highlight: true },
                    { label: 'Vender',          route: '/info/vender' },
                ]);
            },
            error: () => { /* mantiene fallback estático */ },
        });
    }

    ngOnDestroy(): void {
        this.navSub?.unsubscribe();
    }

    onUserClick(): void {
        if (!this.isAuthenticated()) {
            this.modalState.openAuthModal();
        } else {
            this.router.navigate(['/account']);
        }
    }

    onCartClick(): void {
        this.cartService.toggleDrawer();
    }

    onSearch(payload: { query: string; scope: string }): void {
        const q = payload.query.trim();
        if (!q) return;
        this.router.navigate(['/products'], { queryParams: { q, scope: payload.scope } });
    }

    onCategorySelect(c: DsCategory): void {
        if (c.route) {
            this.router.navigateByUrl(c.route);
        }
    }

    /** Click en "Categorías" → toggle del mega-menu */
    onOpenCategoryMenu(): void {
        this.megaMenu?.toggle();
    }

    /** Hover sobre "Categorías" → abrir mega-menu (con cancel del timer de cierre) */
    onHoverCategoryMenu(): void {
        clearTimeout(this.hoverCloseTimer);
        this.megaMenu?.open();
    }

    /** Mouse sale del header — cierra el mega-menu si no se entra al panel en 200ms */
    onLeaveCategoryArea(): void {
        clearTimeout(this.hoverCloseTimer);
        this.hoverCloseTimer = setTimeout(() => this.megaMenu?.close(), 200);
    }

    /** Mouse entra al panel del mega-menu — cancela el cierre */
    onEnterMegaPanel(): void {
        clearTimeout(this.hoverCloseTimer);
    }

    onAuthModalLoginSuccess(): void {
        this.modalState.closeAuthModal();
        const returnUrl = this.modalState.authModalReturnUrl() ?? sessionStorage.getItem('returnUrl');
        if (returnUrl) {
            sessionStorage.removeItem('returnUrl');
            this.router.navigateByUrl(returnUrl);
            return;
        }
        if (this.authService.isCustomer()) {
            this.router.navigate(['/home']);
        }
    }
}
