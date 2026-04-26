import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Divider — línea separadora del DS.
 * Port 1:1 de primitives.jsx → function Divider({ vertical }).
 * Por defecto horizontal (height 1px, full width). Con [vertical]="true"
 * pasa a width 1px y alignSelf stretch.
 */
@Component({
    selector: 'ds-divider',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.is-vertical]': 'vertical()',
        'role': 'separator',
    },
    template: ``,
    styles: [`
        :host {
            display: block;
            background: var(--c-border);
            height: 1px;
            width: 100%;
        }
        :host(.is-vertical) {
            width: 1px;
            height: auto;
            align-self: stretch;
        }
    `],
})
export class DsDividerComponent {
    vertical = input<boolean>(false);
}
