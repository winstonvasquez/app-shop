
import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { agregarItem, debeLimpiarPorCambioDeEmpresa, ProductoParaCarrito } from '../utils/carrito.util';

export interface CartItem {
    productId: number;
    variantId?: number;
    sku?: string;
    variantName?: string;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    stock?: number;
    image: string;
    selected: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private readonly analyticsService = inject(AnalyticsService);
    cartItems = signal<CartItem[]>([]);
    isDrawerOpen = signal(false);

    cartTotal = computed(() => this.cartItems()
        .filter(item => item.selected)
        .reduce((acc, item) => acc + (item.price * item.quantity), 0));

    cartCount = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));

    selectedCount = computed(() => this.cartItems().filter(i => i.selected).length);
    allSelected = computed(() => this.cartItems().length > 0 && this.cartItems().every(i => i.selected));

    toggleDrawer() {
        this.isDrawerOpen.update(v => !v);
    }

    openDrawer() {
        this.isDrawerOpen.set(true);
    }

    closeDrawer() {
        this.isDrawerOpen.set(false);
    }

    private readonly authService = inject(AuthService);

    /**
     * Empresa a la que pertenece el carrito que hay ahora en memoria. `undefined` = todavía no se
     * ha observado ninguna sesión (primera pasada del effect), que NO debe disparar limpieza.
     */
    private empresaDelCarrito: number | null | undefined = undefined;

    constructor() {
        // Load initial state from local storage
        const savedCart = localStorage.getItem(STORAGE_KEYS.cart);
        if (savedCart) {
            this.cartItems.set(JSON.parse(savedCart));
        }

        // Save state to local storage whenever it changes
        effect(() => {
            localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(this.cartItems()));
        });

        // Aislamiento multi-tenant del carrito. AuthService.clearTenantScopedLocalState() borra la
        // clave de localStorage, pero eso NO bastaba: la señal en memoria seguía viva y el effect
        // de arriba la reescribía en la siguiente mutación, así que el carrito de una empresa
        // reaparecía en la sesión de otra sin recargar la página. El estado es de este servicio,
        // así que la limpieza va aquí y no en AuthService (que además no puede inyectar a
        // CartService sin crear un ciclo). Qué transición limpia y cuál no está en
        // `debeLimpiarPorCambioDeEmpresa`, con sus casos cubiertos.
        //
        // currentUser() es una señal de verdad, así que leerla en un effect es correcto (a
        // diferencia de AbstractControl.value, que no lo es y solo se evaluaría una vez).
        effect(() => {
            const empresaActual = this.authService.currentUser()?.activeCompanyId ?? null;
            const anterior = this.empresaDelCarrito;
            this.empresaDelCarrito = empresaActual;
            if (!debeLimpiarPorCambioDeEmpresa(anterior, empresaActual)) return;
            this.cartItems.set([]);
            this.isDrawerOpen.set(false);
            localStorage.removeItem(STORAGE_KEYS.cart);
        });
    }

    addToCart(product: ProductoParaCarrito) {
        this.cartItems.update(items => agregarItem(items, product));
        this.analyticsService.trackAddToCart(product.id, product.name, product.price, product.quantity ?? 1);
    }

    removeFromCart(productId: number) {
        this.cartItems.update(items => items.filter(item => item.productId !== productId));
    }

    updateQuantity(productId: number, quantity: number) {
        if (quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        this.cartItems.update(items =>
            items.map(item =>
                item.productId === productId
                    ? { ...item, quantity }
                    : item
            )
        );
    }

    toggleSelection(productId: number) {
        this.cartItems.update(items =>
            items.map(item =>
                item.productId === productId
                    ? { ...item, selected: !item.selected }
                    : item
            )
        );
    }

    toggleAll(checked: boolean) {
        this.cartItems.update(items =>
            items.map(item => ({ ...item, selected: checked }))
        );
    }

    removeSelected() {
        this.cartItems.update(items => items.filter(item => !item.selected));
    }

    clearCart() {
        this.cartItems.set([]);
    }
}
