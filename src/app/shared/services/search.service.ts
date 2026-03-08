import { Injectable, signal, inject } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private searchQuerySignal = signal<string>('');
    private recentSearchesSignal = signal<string[]>([]);

    popularSearches = [
        { title: 'vestido de mujer', icon: '🔥', image: 'https://placehold.co/40' },
        { title: 'vestidos elegantes para mujeres', image: 'https://placehold.co/40' },
        { title: 'pantalón baggy hombre', image: 'https://placehold.co/40' },
        { title: 'baggy jeans hombre', image: 'https://placehold.co/40' },
        { title: 'jeans hombre', image: 'https://placehold.co/40' },
        { title: 'camisas para hombres', image: 'https://placehold.co/40' },
        { title: 'vestidos de mujer para iglesia', image: 'https://placehold.co/40' },
        { title: 'polos hombre', image: 'https://placehold.co/40' },
        { title: 'pantalones niño', image: 'https://placehold.co/40' }
    ];

    constructor() {
        this.loadRecentSearches();
    }

    get searchQuery() {
        return this.searchQuerySignal;
    }

    get recentSearches() {
        return this.recentSearchesSignal;
    }

    setSearchQuery(query: string) {
        const trimmed = query.trim();
        this.searchQuerySignal.set(trimmed);
        if (trimmed) {
            this.addRecentSearch(trimmed);
        }
    }

    private loadRecentSearches() {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            try {
                this.recentSearchesSignal.set(JSON.parse(saved));
            } catch (e) {
                this.recentSearchesSignal.set([]);
            }
        }
    }

    private addRecentSearch(query: string) {
        const current = this.recentSearchesSignal();
        const updated = [query, ...current.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 5);
        this.recentSearchesSignal.set(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    }

    clearRecentSearches() {
        this.recentSearchesSignal.set([]);
        localStorage.removeItem('recentSearches');
    }
}
