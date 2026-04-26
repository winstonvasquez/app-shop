import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { DsThumbComponent } from '../ds-thumb/ds-thumb.component';
import { DsStarsComponent } from '../ds-stars/ds-stars.component';
import { DsPriceComponent } from '../ds-price/ds-price.component';
import { DsButtonComponent } from '../ds-button/ds-button.component';
import { DsProduct } from '../ds-product-card/ds-product-card.component';

/**
 * ProductRow — variante horizontal/list del product-card.
 * Port 1:1 de product-card.jsx → function ProductRow({ p }).
 *
 * Layout: thumb 140px | info (tag/name/stars/sold/price/perks) | actions (CTA + secondary)
 * Pensado para listings densos, vistas de búsqueda y comparativas.
 */
@Component({
    selector: 'ds-product-row',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        LucideAngularModule,
        DsThumbComponent, DsStarsComponent, DsPriceComponent, DsButtonComponent,
    ],
    template: `
        <article class="row">
            <div class="thumb-slot">
                <ds-thumb [label]="p().name" [tone]="p().tone" [ratio]="1"/>
            </div>

            <div class="info">
                @if (p().tag) {
                    <span class="tag">{{ p().tag }}</span>
                }
                <h3 class="name">{{ p().name }}</h3>

                <div class="meta">
                    <ds-stars [rating]="p().rating" [size]="12"/>
                    <span class="reviews">({{ p().reviews | number }})</span>
                    @if (p().sold) {
                        <span class="dot">·</span>
                        <span>{{ p().sold }}</span>
                    }
                </div>

                <ds-price [now]="p().now" [was]="p().was ?? null" size="lg"/>

                @if (p().shipFree || p().fast) {
                    <div class="perks">
                        @if (p().shipFree) {
                            <span><lucide-icon name="truck" [size]="12"/> Envío gratis</span>
                        }
                        @if (p().fast) {
                            <span><lucide-icon name="bolt" [size]="12"/> Entrega 24h</span>
                        }
                    </div>
                }
            </div>

            <div class="actions">
                <ds-button variant="primary" icon="shopping-cart"
                           (click)="addToCart.emit(p())">Agregar al carrito</ds-button>
                <ds-button variant="secondary" size="sm"
                           (click)="compare.emit(p())">Comparar</ds-button>
            </div>
        </article>
    `,
    styles: [`
        :host { display: block; }
        .row {
            display: flex; gap: 16px;
            padding: 16px;
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
        }
        .thumb-slot { width: 140px; flex-shrink: 0; }
        .info {
            flex: 1; min-width: 0;
            display: flex; flex-direction: column; gap: 6px;
        }
        .tag {
            font-size: 10px; font-weight: 800;
            letter-spacing: .06em; text-transform: uppercase;
            color: var(--c-brand);
        }
        .name {
            font-size: 16px; font-weight: 600;
            color: var(--c-text);
            margin: 0;
            overflow: hidden; text-overflow: ellipsis;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .meta {
            display: flex; align-items: center; gap: 6px;
            font-size: 12px; color: var(--c-muted);
            flex-wrap: wrap;
        }
        .reviews { white-space: nowrap; }
        .dot { color: var(--c-subtle, var(--c-muted)); }
        .perks {
            display: inline-flex; gap: 12px;
            font-size: 12px; color: var(--c-success);
        }
        .perks span { display: inline-flex; gap: 4px; align-items: center; }
        .actions {
            display: flex; flex-direction: column; gap: 8px;
            justify-content: center; flex-shrink: 0;
        }

        @media (max-width: 720px) {
            .row { flex-direction: column; }
            .thumb-slot { width: 100%; max-width: 200px; }
            .actions { flex-direction: row; }
            .actions > * { flex: 1; }
        }
    `],
})
export class DsProductRowComponent {
    p = input.required<DsProduct>();

    addToCart = output<DsProduct>();
    compare = output<DsProduct>();
}
