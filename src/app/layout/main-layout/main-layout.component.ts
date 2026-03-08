import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { FloatingMenuComponent } from '@shared/components/floating-menu/floating-menu.component';
import { CartDrawerComponent } from '@shared/components/cart-drawer/cart-drawer.component';
import { ProductQuickviewComponent } from '@shared/components/product-quickview/product-quickview.component';
import { AuthModal } from '@shared/components/auth-modal/auth-modal.component';
import { ModalStateService } from '@core/services/modal-state.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FloatingMenuComponent, CartDrawerComponent, ProductQuickviewComponent, AuthModal],
  templateUrl: './main-layout.component.html',
  host: { class: 'block w-full' }
})
export class MainLayoutComponent {
  modalState = inject(ModalStateService);
}
