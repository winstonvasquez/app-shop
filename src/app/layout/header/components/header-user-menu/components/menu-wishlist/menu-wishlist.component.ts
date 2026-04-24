import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '@core/services/wishlist.service';

@Component({
    selector: 'app-menu-wishlist',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './menu-wishlist.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuWishlist {
    private wishlistService = inject(WishlistService);
    readonly count = computed(() => this.wishlistService.wishlistItems().length);
}
