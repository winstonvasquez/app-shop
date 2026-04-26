import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/services/cart.service';
import { ModalStateService } from '@core/services/modal-state.service';
import { ThemeService } from '@core/services/theme/theme';

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
    ],
    templateUrl: './main-layout.component.html',
    host: { class: 'block w-full' },
})
export class MainLayoutComponent implements OnInit, OnDestroy {
    modalState = inject(ModalStateService);

    private authService = inject(AuthService);
    private cartService = inject(CartService);
    private router = inject(Router);
    private themeService = inject(ThemeService);
    private navSub?: Subscription;

    /** Categorías top — alimentan el `<ds-category-nav>` del header. */
    readonly headerCategories: DsCategory[] = [
        { label: 'Más vendidos',     route: '/products?sort=bestsellers' },
        { label: 'Tecnología',       route: '/products?cat=tecnologia' },
        { label: 'Hogar',            route: '/products?cat=hogar' },
        { label: 'Moda',             route: '/products?cat=moda' },
        { label: 'Belleza',          route: '/products?cat=belleza' },
        { label: 'Deportes',         route: '/products?cat=deportes' },
        { label: 'Niños',            route: '/products?cat=ninos' },
        { label: 'Ofertas del día',  route: '/offers', highlight: true },
        { label: 'Vender',           route: '/sell' },
    ];

    cartCount = this.cartService.cartCount;
    isAuthenticated = this.authService.isAuthenticated;
    userName = computed(() => this.authService.currentUser()?.username ?? '');

    ngOnInit(): void {
        this.themeService.setContext('shop');
        this.navSub = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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

    onOpenCategoryMenu(): void {
        this.router.navigate(['/categories']);
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
