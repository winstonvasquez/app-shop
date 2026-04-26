import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DsThumbComponent } from '../ds-thumb/ds-thumb.component';
import { DsBadgeComponent, DsBadgeTone } from '../ds-badge/ds-badge.component';
import { DsStarsComponent } from '../ds-stars/ds-stars.component';
import { DsPriceComponent } from '../ds-price/ds-price.component';
import { DsButtonComponent } from '../ds-button/ds-button.component';

export interface DsProduct {
    id: number | string;
    name: string;
    cat?: string;
    tone?: number;
    now: number;
    was?: number;
    rating?: number;
    reviews?: number;
    sold?: string;
    stock?: number;
    badge?: string;
    tag?: string;
    shipFree?: boolean;
    fast?: boolean;
    flash?: number;
    image?: string;
}

/**
 * Product Card — grid layout (workhorse del catálogo).
 * Port 1:1 de product-card.jsx → function ProductCard({ p })
 * Usa primitives: Thumb, Badge, Stars, Price, Button.
 */
@Component({
    selector: 'ds-product-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        LucideAngularModule,
        DsThumbComponent, DsBadgeComponent, DsStarsComponent,
        DsPriceComponent, DsButtonComponent,
    ],
    template: `
        <article class="card" (click)="cardClick.emit(p())">
            <div class="media">
                <ds-thumb [label]="p().name" [tone]="p().tone ?? 0" [ratio]="1" [src]="p().image ?? null"/>
                @if (p().badge) {
                    <div class="badge-abs">
                        <ds-badge [tone]="badgeTone()">{{ p().badge }}</ds-badge>
                    </div>
                }
                <button class="fav" aria-label="Favorito" (click)="onFav($event)">
                    <lucide-icon name="heart" [size]="16"/>
                </button>
                @if (p().flash) {
                    <div class="flash">
                        <span class="flash-lbl">
                            <lucide-icon name="zap" [size]="12"/> OFERTA RELÁMPAGO
                        </span>
                        <span>{{ p().flash }}h restantes</span>
                    </div>
                }
            </div>
            <div class="body">
                @if (p().tag) { <span class="tag">{{ p().tag }}</span> }
                <h3 class="name">{{ p().name }}</h3>
                @if (p().rating !== undefined) {
                    <div class="rating">
                        <ds-stars [rating]="p().rating ?? 0" [size]="11" [showValue]="false"/>
                        @if (p().reviews !== undefined) {
                            <span>({{ reviewsText() }})</span>
                        }
                    </div>
                }
                <div class="price">
                    <ds-price [now]="p().now" [was]="p().was ?? null" size="md"/>
                </div>
                @if (p().shipFree || p().fast) {
                    <div class="ship">
                        @if (p().shipFree) {
                            <span class="free">
                                <lucide-icon name="truck" [size]="12"/> Envío gratis
                            </span>
                        }
                        @if (p().fast) {
                            <span>
                                <lucide-icon name="zap" [size]="12"/> 24h
                            </span>
                        }
                    </div>
                }
                @if (p().sold) { <div class="sold">{{ p().sold }}</div> }
                <div class="cta">
                    <ds-button variant="primary" size="sm" [full]="true" icon="shopping-cart"
                        (click)="onAddToCart($event)">Agregar</ds-button>
                </div>
            </div>
        </article>
    `,
    styles: [`
        :host { display: block; height: 100%; }
        .card {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            box-shadow: var(--s-sm);
            overflow: hidden;
            display: flex; flex-direction: column;
            transition: transform 120ms, box-shadow 120ms;
            height: 100%; cursor: pointer;
            font-family: var(--f-sans);
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: var(--s-md);
        }
        .media { position: relative; }
        .badge-abs { position: absolute; top: 8px; left: 8px; z-index: 2; }
        .fav {
            position: absolute; top: 8px; right: 8px; z-index: 2;
            width: 32px; height: 32px; border-radius: 999px;
            background: rgba(255,255,255,.92);
            border: 1px solid var(--c-border);
            display: inline-flex; align-items: center; justify-content: center;
            color: var(--c-muted); cursor: pointer;
            transition: color 120ms, background 120ms;
        }
        .fav:hover { color: var(--c-brand); background: #fff; }
        .flash {
            position: absolute; bottom: 8px; left: 8px; right: 8px;
            padding: 4px 8px;
            background: rgba(0,0,0,.7); color: #fff;
            border-radius: var(--r-sm);
            font-size: 11px; font-weight: 700;
            display: flex; align-items: center; justify-content: space-between;
        }
        .flash-lbl { display: inline-flex; align-items: center; gap: 4px; }
        .body {
            padding: var(--p-card);
            display: flex; flex-direction: column; gap: 6px;
            flex: 1;
        }
        .tag {
            font-size: 10px; font-weight: 800; letter-spacing: .06em;
            color: var(--c-brand); text-transform: uppercase;
        }
        .name {
            font-size: 13px; font-weight: 500; color: var(--c-text);
            margin: 0; line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; min-height: 36px;
        }
        .rating {
            display: flex; align-items: center; gap: 6px;
            font-size: 11px; color: var(--c-muted);
        }
        .price { margin-top: 2px; }
        .ship {
            display: flex; align-items: center; gap: 8px;
            font-size: 11px; color: var(--c-muted); flex-wrap: wrap;
        }
        .ship .free { color: var(--c-success); font-weight: 600;
            display: inline-flex; align-items: center; gap: 3px; }
        .ship > span { display: inline-flex; align-items: center; gap: 3px; }
        .sold { font-size: 11px; color: var(--c-subtle); }
        .cta { display: flex; gap: 6px; margin-top: auto; padding-top: 8px; }
    `],
})
export class DsProductCardComponent {
    p = input.required<DsProduct>();
    cardClick = output<DsProduct>();
    addToCart = output<DsProduct>();
    toggleFav = output<DsProduct>();

    protected badgeTone = computed<DsBadgeTone>(() => {
        const b = this.p().badge ?? '';
        if (b.startsWith('-')) return 'danger';
        if (b === 'NUEVO') return 'info';
        if (b === 'POCAS') return 'warn';
        return 'brand';
    });

    protected reviewsText = computed(() => {
        const r = this.p().reviews;
        return r !== undefined ? r.toLocaleString('es-PE') : '';
    });

    protected onFav(ev: MouseEvent) {
        ev.stopPropagation();
        this.toggleFav.emit(this.p());
    }

    protected onAddToCart(ev: unknown) {
        const e = ev as MouseEvent;
        e?.stopPropagation?.();
        this.addToCart.emit(this.p());
    }
}
