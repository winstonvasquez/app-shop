import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class QuickviewService {
    private _isOpen = signal(false);
    private _productId = signal<number | null>(null);

    isOpen = this._isOpen.asReadonly();
    productId = this._productId.asReadonly();

    open(productId: number) {
        this._productId.set(productId);
        this._isOpen.set(true);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    close() {
        this._isOpen.set(false);
        setTimeout(() => {
            this._productId.set(null);
        }, 300); // Clear after animation if any
        document.body.style.overflow = '';
    }
}
