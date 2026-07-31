
import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { STORAGE_KEYS } from '@shared/constants/app.constants';

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
        // CartService sin crear un ciclo).
        //
        // Transiciones y por qué:
        //   null -> X  (invitado que inicia sesión): NO se limpia. El invitado estaba comprando en
        //              ESE storefront; borrarle el carrito al loguearse sería una regresión de UX.
        //   X -> Y     (cambio de empresa activa): se limpia. Los productIds de X no existen en Y.
        //   X -> null  (logout): se limpia, para que el siguiente usuario del navegador no herede
        //              el carrito del anterior.
        // currentUser() es una señal de verdad, así que leerla en un effect es correcto (a
        // diferencia de AbstractControl.value, que no lo es y solo se evaluaría una vez).
        effect(() => {
            const empresaActual = this.authService.currentUser()?.activeCompanyId ?? null;
            const anterior = this.empresaDelCarrito;
            this.empresaDelCarrito = empresaActual;
            if (anterior === undefined || anterior === empresaActual) return;
            if (anterior === null) return; // invitado -> sesión: se conserva
            this.cartItems.set([]);
            this.isDrawerOpen.set(false);
            localStorage.removeItem(STORAGE_KEYS.cart);
        });
    }

    addToCart(product: {
        id: number;
        variantId?: number;
        sku?: string;
        variantName?: string;
        name: string;
        description?: string;
        price: number;
        quantity?: number;
        stock?: number;
        image: string;
    }) {
        this.cartItems.update(items => {
            const isSameItem = (item: CartItem) =>
                product.variantId !== undefined
                    ? item.variantId === product.variantId
                    : item.productId === product.id && item.variantId === undefined;

            const existingItem = items.find(isSameItem);
            if (existingItem) {
                return items.map(item =>
                    isSameItem(item)
                        ? { ...item, quantity: item.quantity + (product.quantity ?? 1), selected: true }
                        : item
                );
            }
            return [...items, {
                productId: product.id,
                variantId: product.variantId,
                sku: product.sku,
                variantName: product.variantName,
                name: product.name,
                description: product.description,
                price: product.price,
                quantity: product.quantity ?? 1,
                stock: product.stock,
                image: product.image,
                selected: true
            }];
        });
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
