import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { WishlistService, WishlistItem } from '@core/services/wishlist.service';
import { CartService } from '@features/cart/services/cart.service';
import { AuthService } from '@core/auth/auth.service';
import {
    DsAccountShellComponent,
    DsButtonComponent,
    DsPriceComponent,
} from '@shared/ui/ds';

@Component({
    selector: 'app-account-wishlist',
    standalone: true,
    imports: [
        RouterLink,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
        DsPriceComponent,
    ],
    templateUrl: './account-wishlist.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountWishlistComponent implements OnInit {
    private wishlistService = inject(WishlistService);
    private cartService     = inject(CartService);
    private authService     = inject(AuthService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    items        = this.wishlistService.wishlistItems;
    loading      = signal(true);
    removing     = signal<number | null>(null);
    addingToCart = signal<number | null>(null);

    ngOnInit(): void {
        this.wishlistService.loadWishlist();
        this.loading.set(false);
    }

    remove(productoId: number): void {
        this.removing.set(productoId);
        this.wishlistService.remove(productoId).subscribe({
            next: () => this.removing.set(null),
            error: () => this.removing.set(null),
        });
    }

    addToCart(item: WishlistItem): void {
        this.addingToCart.set(item.productoId);
        this.cartService.addToCart({
            id: item.productoId,
            name: item.productoNombre,
            price: item.precioBase,
            image: item.productoImagen ?? '',
        });
        this.addingToCart.set(null);
    }
}
