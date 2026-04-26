import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Wordmark — logotipo "app[shop]" con color brand en "shop".
 * Port 1:1 de primitives.jsx → function Wordmark({ inverted, size })
 */
@Component({
    selector: 'ds-wordmark',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="mark" [style]="styles()">
            <span [style.color]="fg()">app</span><span [style.color]="accent()">shop</span>
        </span>
    `,
    styles: [`
        :host { display: inline-flex; }
        .mark {
            display: inline-flex; align-items: baseline; gap: 2px;
            font-family: var(--f-display);
            font-weight: 800; letter-spacing: -0.02em;
            line-height: 1;
        }
    `],
})
export class DsWordmarkComponent {
    inverted = input<boolean>(false);
    size = input<number>(22);

    protected fg = computed(() => this.inverted() ? 'var(--c-headerFg, #fff)' : 'var(--c-text)');
    protected accent = computed(() => 'var(--c-brand)');
    protected styles = computed(() => ({
        fontSize: `${this.size()}px`,
        color: this.fg(),
    }));
}
