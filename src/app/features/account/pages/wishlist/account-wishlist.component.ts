import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { WishlistService, WishlistItem } from '@core/services/wishlist.service';
import { CartService } from '@features/cart/services/cart.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-account-wishlist',
    standalone: true,
    imports: [RouterLink, CurrencyPipe, BreadcrumbComponent],
    templateUrl: './account-wishlist.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountWishlistComponent implements OnInit {
    private wishlistService = inject(WishlistService);
    private cartService = inject(CartService);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Mis Favoritos' },
    ];

    items = this.wishlistService.wishlistItems;
    loading = signal(true);
    removing = signal<number | null>(null);
    addingToCart = signal<number | null>(null);

    ngOnInit(): void {
        this.wishlistService.loadWishlist();
        // Marcar carga como completada después de llamar al servicio
        // Los ítems se cargan de forma asíncrona; el signal se actualiza solo
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
