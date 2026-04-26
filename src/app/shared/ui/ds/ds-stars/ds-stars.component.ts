import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Stars rating — 5 estrellas llenas/vacías con valor opcional.
 * Port 1:1 de primitives.jsx → function Stars({ rating, size, showValue })
 */
@Component({
    selector: 'ds-stars',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="wrap">
            <span class="stars">
                @for (i of [0,1,2,3,4]; track i) {
                    <svg
                        [attr.width]="size()" [attr.height]="size()"
                        viewBox="0 0 20 20"
                        [attr.fill]="i < rounded() ? 'currentColor' : 'var(--c-border)'">
                        <path d="M10 2.5l2.4 5 5.5.8-4 3.9 1 5.4L10 15l-4.9 2.6 1-5.4-4-3.9 5.5-.8L10 2.5Z"/>
                    </svg>
                }
            </span>
            @if (showValue()) {
                <span class="value" [style.font-size.px]="size()">{{ rating().toFixed(1) }}</span>
            }
        </span>
    `,
    styles: [`
        :host { display: inline-flex; }
        .wrap { display: inline-flex; align-items: center; gap: 4px; }
        .stars { display: inline-flex; gap: 1px; color: var(--c-accent); }
        .value { font-weight: 600; color: var(--c-text); font-family: var(--f-sans); }
    `],
})
export class DsStarsComponent {
    rating = input<number>(4.7);
    size = input<number>(12);
    showValue = input<boolean>(true);

    protected rounded = computed(() => Math.round(this.rating()));
}
