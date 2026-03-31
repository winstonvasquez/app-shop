import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface BrowseHistoryItem {
    id: number;
    name: string;
    image: string;
    price: number;
    slug: string;
}

@Component({
    selector: 'app-account-history',
    standalone: true,
    imports: [CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-container">
            <div class="page-header">
                <h1 class="page-title">Historial de navegación</h1>
                <p class="page-subtitle">Productos que visitaste recientemente</p>
            </div>

            @if (items().length === 0) {
                <div class="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                        class="opacity-40">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p class="text-base font-medium">Aún no has visitado productos</p>
                    <a routerLink="/products"
                        class="text-sm text-[var(--color-primary)] hover:underline font-semibold">
                        Explorar productos
                    </a>
                </div>
            } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                    @for (item of items(); track item.id) {
                        <a [routerLink]="['/products', item.slug || item.id]"
                            class="card flex flex-col gap-2 no-underline group cursor-pointer">
                            <div class="aspect-square rounded-lg overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                                <img [src]="item.image" [alt]="item.name"
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div class="px-1 pb-1">
                                <p class="text-xs text-[var(--color-text-primary)] font-medium line-clamp-2 leading-snug">
                                    {{ item.name }}
                                </p>
                                <p class="text-sm font-black text-[var(--color-accent)] mt-1">
                                    S/ {{ item.price.toFixed(2) }}
                                </p>
                            </div>
                        </a>
                    }
                </div>
            }
        </div>
    `,
})
export class AccountHistoryComponent implements OnInit {
    items = signal<BrowseHistoryItem[]>([]);

    ngOnInit(): void {
        try {
            const raw = localStorage.getItem('browse_history');
            this.items.set(raw ? JSON.parse(raw) : []);
        } catch {
            this.items.set([]);
        }
    }
}
