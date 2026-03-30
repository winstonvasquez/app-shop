import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { FloatingMenuComponent } from '@shared/components/floating-menu/floating-menu.component';
import { FloatingChatComponent } from '@shared/components/floating-chat/floating-chat.component';
import { CartDrawerComponent } from '@shared/components/cart-drawer/cart-drawer.component';
import { ProductQuickviewComponent } from '@shared/components/product-quickview/product-quickview.component';
import { AuthModal } from '@shared/components/auth-modal/auth-modal.component';
import { ToastContainerComponent } from '@shared/components/toast/toast-container.component';
import { ModalStateService } from '@core/services/modal-state.service';
import { AuthService } from '@core/auth/auth.service';
import { Subscription, filter } from 'rxjs';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, FooterComponent, FloatingMenuComponent, FloatingChatComponent, CartDrawerComponent, ProductQuickviewComponent, AuthModal, ToastContainerComponent],
    templateUrl: './main-layout.component.html',
    host: { class: 'block w-full' }
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  modalState = inject(ModalStateService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private navSub?: Subscription;

  ngOnInit() {
    this.navSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  /** Llamado cuando el AuthModal completa login/registro exitosamente */
  onAuthModalLoginSuccess(): void {
    this.modalState.closeAuthModal();

    // Navegar a returnUrl si existe (puesto por customerGuard o por apertura explícita)
    const returnUrl = this.modalState.authModalReturnUrl() ?? sessionStorage.getItem('returnUrl');
    if (returnUrl) {
      sessionStorage.removeItem('returnUrl');
      this.router.navigateByUrl(returnUrl);
      return;
    }

    // Por defecto: clientes van a /home
    if (this.authService.isCustomer()) {
      this.router.navigate(['/home']);
    }
  }
}
