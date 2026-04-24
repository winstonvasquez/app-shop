import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';

export interface WishlistItem {
    id: number;
    productoId: number;
    productoNombre: string;
    productoImagen: string | null;
    precioBase: number;
    varianteId: number | null;
    varianteNombre: string | null;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    private readonly base = `${environment.apiUrls.sales}/api/wishlists`;

    private _items = signal<WishlistItem[]>([]);
    readonly wishlistItems = this._items.asReadonly();

    readonly wishlistIds = computed(() =>
        new Set(this._items().map(item => item.productoId))
    );

    isInWishlist(productoId: number): boolean {
        return this.wishlistIds().has(productoId);
    }

    loadWishlist(): void {
        if (!this.authService.isAuthenticated()) return;
        this.http.get<WishlistItem[]>(this.base).subscribe({
            next: items => this._items.set(items),
            error: () => this._items.set([]),
        });
    }

    toggle(productoId: number, varianteId?: number): Observable<WishlistItem | void> {
        if (this.isInWishlist(productoId)) {
            return this.remove(productoId);
        }
        return this.add(productoId, varianteId);
    }

    add(productoId: number, varianteId?: number): Observable<WishlistItem> {
        return this.http
            .post<WishlistItem>(this.base, { productoId, varianteId: varianteId ?? null })
            .pipe(
                tap(item => this._items.update(list => [...list, item]))
            );
    }

    remove(productoId: number): Observable<void> {
        return this.http
            .delete<void>(`${this.base}/${productoId}`)
            .pipe(
                tap(() => this._items.update(list => list.filter(i => i.productoId !== productoId)))
            );
    }

    getStatus(productoId: number): Observable<{ esFavorito: boolean }> {
        return this.http.get<{ esFavorito: boolean }>(`${this.base}/${productoId}/status`);
    }
}
