import { Component, inject, computed, input } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { MenuOrders } from './components/menu-orders/menu-orders.component';
import { MenuReviews } from './components/menu-reviews/menu-reviews.component';
import { MenuProfile } from './components/menu-profile/menu-profile.component';
import { MenuCoupons } from './components/menu-coupons/menu-coupons.component';
import { MenuCredit } from './components/menu-credit/menu-credit.component';
import { MenuFollowedStores } from './components/menu-followed-stores/menu-followed-stores.component';
import { MenuBrowsingHistory } from './components/menu-browsing-history/menu-browsing-history.component';
import { MenuAddresses } from './components/menu-addresses/menu-addresses.component';
import { MenuSecurity } from './components/menu-security/menu-security.component';
import { MenuPermissions } from './components/menu-permissions/menu-permissions.component';
import { MenuNotifications } from './components/menu-notifications/menu-notifications.component';
import { MenuSwitchAccount } from './components/menu-switch-account/menu-switch-account.component';
import { MenuLogout } from './components/menu-logout/menu-logout.component';

@Component({
  selector: 'app-header-user-menu',
  imports: [
    MenuOrders, MenuReviews, MenuProfile, MenuCoupons, MenuCredit,
    MenuFollowedStores, MenuBrowsingHistory, MenuAddresses, MenuSecurity,
    MenuPermissions, MenuNotifications, MenuSwitchAccount, MenuLogout
  ],
  templateUrl: './header-user-menu.component.html',
  styleUrl: './header-user-menu.component.scss',
})
export class HeaderUserMenu {
  isOpen = input(false);
  private authService = inject(AuthService);
  userName = computed(() => this.authService.currentUser()?.username || 'Invitado');
}
