
import { Injectable, computed, effect, signal, inject } from '@angular/core';

export interface CartItem {
    productId: number;
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

    addToCart(product: any) {
        this.cartItems.update(items => {
            const existingItem = items.find(item => item.productId === product.id);
            if (existingItem) {
                return items.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1, selected: true } // Auto-select on add
                        : item
                );
            }
            return [...items, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image,
                selected: true
            }];
        });
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
