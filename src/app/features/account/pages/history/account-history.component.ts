import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { DsAccountShellComponent } from '@shared/ui/ds';

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
    imports: [RouterLink, LucideAngularModule, DsAccountShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ds-account-shell title="Historial de navegación" subtitle="Productos que visitaste recientemente" [userName]="userName()">

            @if (items().length === 0) {
                <div class="empty">
                    <lucide-icon name="clock" [size]="56" class="empty-icon"/>
                    <p class="empty-title">Aún no has visitado productos</p>
                    <a routerLink="/products" class="explore-link">Explorar productos</a>
                </div>
            } @else {
                <div class="grid">
                    @for (item of items(); track item.id) {
                        <a [routerLink]="['/products', item.slug || item.id]" class="item-card">
                            <div class="item-img">
                                <img [src]="item.image" [alt]="item.name" class="img"/>
                            </div>
                            <div class="item-body">
                                <p class="item-name">{{ item.name }}</p>
                                <p class="item-price">S/ {{ item.price.toFixed(2) }}</p>
                            </div>
                        </a>
                    }
                </div>
            }

        </ds-account-shell>

        <style>
            .empty {
                display: flex; flex-direction: column; align-items: center;
                gap: 12px; padding: 60px 24px;
                color: var(--c-muted);
            }
            .empty-icon { opacity: 0.35; }
            .empty-title { font-size: 15px; font-weight: 600; color: var(--c-text); margin: 0; }
            .explore-link {
                font-size: 13px; font-weight: 600;
                color: var(--c-brand); text-decoration: none;
                padding: 8px 20px;
                border: 1px solid var(--c-brand);
                border-radius: var(--r-md);
                transition: background 120ms;
            }
            .explore-link:hover { background: color-mix(in srgb, var(--c-brand) 8%, transparent); }

            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 12px;
            }
            .item-card {
                background: var(--c-surface);
                border: 1px solid var(--c-border);
                border-radius: var(--r-lg);
                text-decoration: none;
                overflow: hidden;
                display: flex; flex-direction: column;
                transition: box-shadow 150ms;
            }
            .item-card:hover { box-shadow: 0 4px 16px color-mix(in srgb, var(--c-brand) 15%, transparent); }
            .item-img {
                aspect-ratio: 1 / 1;
                background: var(--c-surface2);
                overflow: hidden;
            }
            .img { width: 100%; height: 100%; object-fit: cover; transition: transform 300ms; }
            .item-card:hover .img { transform: scale(1.05); }
            .item-body { padding: 10px 12px; }
            .item-name {
                font-size: 12px; font-weight: 500;
                color: var(--c-text);
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
                margin: 0 0 4px; line-height: 1.4;
            }
            .item-price {
                font-size: 14px; font-weight: 800;
                color: var(--c-accent); margin: 0;
            }
        </style>
    `,
})
export class AccountHistoryComponent implements OnInit {
    private authService = inject(AuthService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');
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
