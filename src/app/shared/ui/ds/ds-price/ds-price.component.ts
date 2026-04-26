import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type DsPriceSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type DsPriceTone = 'priceNow' | 'text' | 'brand';

/**
 * Price — precio ahora + tachado opcional.
 * Port 1:1 de primitives.jsx → function Price({ now, was, size, currency, tone })
 */
@Component({
    selector: 'ds-price',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="wrap">
            <span class="now" [style]="nowStyle()">
                <span class="cur" [style]="curStyle()">{{ currency() }}</span>
                {{ now() }}
            </span>
            @if (was()) {
                <span class="was" [style]="wasStyle()">{{ currency() }} {{ was() }}</span>
            }
        </span>
    `,
    styles: [`
        :host { display: inline-flex; }
        .wrap {
            display: inline-flex; align-items: baseline; gap: 8px;
            font-family: var(--f-sans);
        }
        .now {
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1;
        }
        .cur { font-weight: 700; margin-right: 2px; }
        .was { text-decoration: line-through; color: var(--c-priceOld); }
    `],
})
export class DsPriceComponent {
    now = input.required<number | string>();
    was = input<number | string | null>(null);
    size = input<DsPriceSize>('md');
    currency = input<string>('S/');
    tone = input<DsPriceTone>('priceNow');

    protected sizePx = computed<number>(() => {
        const map: Record<DsPriceSize, number> = { sm: 14, md: 18, lg: 24, xl: 32, '2xl': 40 };
        return map[this.size()];
    });

    protected nowStyle = computed(() => ({
        fontSize: `${this.sizePx()}px`,
        color: `var(--c-${this.tone()})`,
    }));

    protected curStyle = computed(() => ({
        fontSize: `${this.sizePx() * 0.6}px`,
    }));

    protected wasStyle = computed(() => ({
        fontSize: `${this.sizePx() * 0.6}px`,
    }));
}
