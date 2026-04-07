import { Injectable, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { CartService } from '@features/cart/services/cart.service';
import { environment } from '@env/environment';

const API = `${environment.apiUrls.sales}/api/v1`;

/**
 * Sincroniza el carrito con el backend para activar la recuperación de carritos abandonados.
 * Solo envía para usuarios autenticados o con email de invitado conocido.
 * Usa debounce de 3 segundos para evitar llamadas excesivas.
 */
@Injectable({ providedIn: 'root' })
export class CartSyncService {
    private http       = inject(HttpClient);
    private authService = inject(AuthService);
    private cartService = inject(CartService);

    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        // Sincronizar cuando cambia el carrito
        effect(() => {
            const items = this.cartService.cartItems();
            const total = this.cartService.cartTotal();
            if (items.length > 0) {
                this.scheduledSync(items, total);
            }
        });
    }

    private scheduledSync(items: unknown[], total: number): void {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.doSync(items, total), 3000);
    }

    private doSync(items: unknown[], total: number): void {
        const user = this.authService.currentUser();
        const userId  = user?.userId ?? null;
        const companyId = user?.activeCompanyId ?? null;

        if (!userId) return; // Solo usuarios autenticados por ahora

        const body = {
            userId,
            companyId,
            itemsJson: JSON.stringify(items),
            total,
        };

        this.http.post(`${API}/carritos-abandonados/sync`, body)
            .subscribe({ error: () => {} }); // fire-and-forget
    }

    /** Llamar tras completar un pedido para marcar el carrito como recuperado. */
    markRecovered(): void {
        const user = this.authService.currentUser();
        if (!user?.userId) return;
        this.http.post(`${API}/carritos-abandonados/recuperado`, { userId: user.userId })
            .subscribe({ error: () => {} });
    }
}
