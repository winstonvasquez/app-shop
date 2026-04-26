import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type DsCardElevation = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Card — wrapper genérico del DS Confianza.
 * Port 1:1 de primitives.jsx → function Card({ padding, hover, elevation }).
 *
 * Por defecto usa surface + border + shadow. Con [hover]="true" levita en hover.
 */
@Component({
    selector: 'ds-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.is-hover]': 'hover()',
    },
    template: `<div class="card" [style]="cardStyle()"><ng-content/></div>`,
    styles: [`
        :host { display: block; }
        .card {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            transition: box-shadow 200ms cubic-bezier(0,0,.2,1),
                        transform 200ms cubic-bezier(0,0,.2,1);
        }
        :host(.is-hover) .card:hover {
            box-shadow: var(--s-lg);
            transform: translateY(-2px);
        }
    `],
})
export class DsCardComponent {
    padding = input<number>(16);
    elevation = input<DsCardElevation>('md');
    hover = input<boolean>(false);

    protected cardStyle = computed(() =>
        `padding: ${this.padding()}px; box-shadow: var(--s-${this.elevation()});`
    );
}
