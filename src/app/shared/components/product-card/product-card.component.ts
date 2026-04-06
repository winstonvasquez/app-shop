import { Component, input, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '@features/cart/services/cart.service';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { QuickviewService } from '@shared/services/quickview.service';
import { UrlEncryptionService } from '@core/services/url-encryption.service';
import { WishlistService } from '@core/services/wishlist.service';
import { AuthService } from '@core/auth/auth.service';

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sold?: string;
  rating?: number;
  badge?: string;
  discount?: string;
  /** When true the image area uses amber accent background */
  featured?: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './product-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
  product = input.required<Product>();
  private cartService = inject(CartService);
  private quickviewService = inject(QuickviewService);
  private router = inject(Router);
  private urlEncryption = inject(UrlEncryptionService);
  readonly wishlistService = inject(WishlistService);
  private authService = inject(AuthService);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly isFavorito = computed(() => this.wishlistService.isInWishlist(this.product().id));

  private toggling = signal(false);

  navigateToDetail() {
    const encryptedId = this.urlEncryption.encrypt(this.product().id);
    this.router.navigate(['/products', encryptedId]);
  }

  openQuickview(event: Event) {
    event.stopPropagation();
    this.quickviewService.open(this.product().id);
  }

  toggleWishlist(event: Event) {
    event.stopPropagation();
    if (!this.isAuthenticated() || this.toggling()) return;
    this.toggling.set(true);
    this.wishlistService.toggle(this.product().id).subscribe({
      complete: () => this.toggling.set(false),
      error: () => this.toggling.set(false),
    });
  }
}
