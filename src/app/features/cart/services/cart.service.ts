
import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { AnalyticsService } from '@core/services/analytics.service';

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

    constructor() {
        // Load initial state from local storage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            this.cartItems.set(JSON.parse(savedCart));
        }

        // Save state to local storage whenever it changes
        effect(() => {
            localStorage.setItem('cart', JSON.stringify(this.cartItems()));
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
