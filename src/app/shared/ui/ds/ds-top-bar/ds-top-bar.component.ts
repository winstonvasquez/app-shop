import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * TopBar — utility bar con envío/protección/ubicación + ayuda/idioma.
 * Port 1:1 de chrome.jsx → function TopBar()
 */
@Component({
    selector: 'ds-top-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
    template: `
        <div class="bar">
            <div class="inner">
                <div class="group">
                    <span class="item"><lucide-icon name="truck" [size]="14"/> Envío gratis desde S/ 99</span>
                    <span class="item"><lucide-icon name="shield" [size]="14"/> Compra protegida</span>
                    <span class="item"><lucide-icon name="map-pin" [size]="14"/> Entrega en Lima en 24h</span>
                </div>
                <div class="group">
                    <span>Descarga la app</span>
                    <span>Ayuda</span>
                    <span class="item">🇵🇪 ES <lucide-icon name="chevron-down" [size]="12"/></span>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .bar {
            background: var(--c-surface2);
            border-bottom: 1px solid var(--c-border);
            font-size: 12px; color: var(--c-muted);
            font-family: var(--f-sans);
        }
        .inner {
            max-width: 1280px; margin: 0 auto;
            padding: 6px 24px;
            display: flex; justify-content: space-between; align-items: center; gap: 16px;
        }
        .group { display: flex; gap: 16px; align-items: center; }
        .item { display: inline-flex; align-items: center; gap: 4px; }
        @media (max-width: 768px) {
            .group:first-child .item:nth-child(n+2) { display: none; }
        }
    `],
})
export class DsTopBarComponent {}
