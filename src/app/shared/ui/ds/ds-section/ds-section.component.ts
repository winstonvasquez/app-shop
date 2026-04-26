import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Section — bloque temático del DS con título + slot de acción.
 * Port 1:1 de primitives.jsx → function Section({ title, action, children }).
 *
 * Estructura:
 *   <section>
 *     <header>
 *       <h2>{title}</h2>
 *       <ng-content select="[slot=action]"/>  ← acción opcional (link, botón, …)
 *     </header>
 *     <ng-content/>                            ← contenido principal
 *   </section>
 */
@Component({
    selector: 'ds-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="ds-section">
            @if (title()) {
                <header>
                    <h2>{{ title() }}</h2>
                    <ng-content select="[slot=action]"/>
                </header>
            }
            <ng-content/>
        </section>
    `,
    styles: [`
        :host { display: block; }
        .ds-section { display: flex; flex-direction: column; gap: 16px; }
        header {
            display: flex; align-items: baseline; justify-content: space-between;
        }
        h2 {
            font-family: var(--f-display);
            font-size: 24px; font-weight: 800;
            color: var(--c-text);
            margin: 0;
            letter-spacing: -.02em;
        }
    `],
})
export class DsSectionComponent {
    title = input<string>('');
}
