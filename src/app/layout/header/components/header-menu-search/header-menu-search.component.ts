import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, merge } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/services/cart.service';
import { ModalStateService } from '@core/services/modal-state.service';
import { HeaderSearchDropdownComponent } from '../header-search-dropdown/header-search-dropdown.component';
import { HeaderUserMenu } from '../header-user-menu/header-user-menu.component';
import { CategoryMegaMenuComponent } from '@shared/components/category-mega-menu/category-mega-menu.component';

interface SubNavItem {
    labelKey: string;
    icon?: string;
    hasDropdown?: boolean;
}

@Component({
    selector: 'app-header-menu-search',
    standalone: true,
    imports: [CommonModule, RouterLink, TranslateModule, HeaderSearchDropdownComponent, HeaderUserMenu, CategoryMegaMenuComponent],
    templateUrl: './header-menu-search.component.html',
  host: { class: 'block w-full' }
})
export class HeaderMenuSearchComponent implements OnInit, OnDestroy {
    private authService = inject(AuthService);
    private cartService = inject(CartService);
    private translate = inject(TranslateService);
    private modalState = inject(ModalStateService);

    isAuthenticated = this.authService.isAuthenticated;
    isUserMenuOpen = signal(false);
    mobileMenuOpen = signal(false);

    toggleMobileMenu() { this.mobileMenuOpen.update(v => !v); }
    closeMobileMenu() { this.mobileMenuOpen.set(false); }

    handleUserMenuClick() {
        if (!this.isAuthenticated()) {
            this.modalState.openAuthModal();
        } else {
            this.isUserMenuOpen.update(v => !v);
        }
    }

    closeUserMenu() {
        if (this.isUserMenuOpen()) {
            this.isUserMenuOpen.set(false);
        }
    }

    cartCount = this.cartService.cartCount;

    // Reactive translated strings — updated on language change
    saveMore = signal(this.t('header.saveMore'));
    searchPlaceholder = signal(this.t('header.search'));
    helloLabel = signal(this.t('header.hello'));
    ordersLabel = signal(this.t('header.ordersAndAccount'));
    bestSellers = signal(this.t('header.bestSellers'));
    fiveStars = signal(this.t('header.fiveStars'));
    whatsNew = signal(this.t('header.whatsNew'));
    categories = signal(this.t('header.categories'));

    userName = computed(() =>
        this.authService.currentUser()?.username || this.t('auth.guest')
    );

    private langSub?: Subscription;

    ngOnInit() {
        // onTranslationChange: fires when async JSON finishes loading (first load)
        // onLangChange: fires on language switch
        this.langSub = merge(
            this.translate.onTranslationChange,
            this.translate.onLangChange
        ).subscribe(() => {
            this.saveMore.set(this.t('header.saveMore'));
            this.searchPlaceholder.set(this.t('header.search'));
            this.helloLabel.set(this.t('header.hello'));
            this.ordersLabel.set(this.t('header.ordersAndAccount'));
            this.bestSellers.set(this.t('header.bestSellers'));
            this.fiveStars.set(this.t('header.fiveStars'));
            this.whatsNew.set(this.t('header.whatsNew'));
            this.categories.set(this.t('header.categories'));
        });
    }

    toggleDrawer() {
        this.cartService.toggleDrawer();
    }

    ngOnDestroy() {
        this.langSub?.unsubscribe();
    }

    private t(key: string): string {
        return this.translate.instant(key);
    }
}
