import { Injectable, signal, computed } from '@angular/core';

export interface CompareProduct {
    id: number;
    name: string;
    price: number;
    image: string;
    attributes?: Record<string, string>;
}

const MAX_COMPARE = 4;

@Injectable({ providedIn: 'root' })
export class CompareService {
    private _items = signal<CompareProduct[]>([]);

    readonly items = this._items.asReadonly();
    readonly count = computed(() => this._items().length);
    readonly isFull = computed(() => this._items().length >= MAX_COMPARE);

    isInCompare(productId: number): boolean {
        return this._items().some(p => p.id === productId);
    }

    toggle(product: CompareProduct): void {
        const current = this._items();
        const idx = current.findIndex(p => p.id === product.id);
        if (idx >= 0) {
            this._items.set(current.filter(p => p.id !== product.id));
        } else if (current.length < MAX_COMPARE) {
            this._items.set([...current, product]);
        }
    }

    remove(productId: number): void {
        this._items.update(items => items.filter(p => p.id !== productId));
    }

    clear(): void {
        this._items.set([]);
    }
}
