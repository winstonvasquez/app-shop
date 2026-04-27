import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export interface DsCategory {
    label: string;
    icon?: string;
    highlight?: boolean;
    /** ruta opcional (si se provee, el wrapper navega ahí). */
    route?: string;
}

/**
 * CategoryNav — barra horizontal bajo el header con botón "Categorías"
 * y chips de categorías top. Port 1:1 de chrome.jsx → function CategoryNav().
 */
@Component({
    selector: 'ds-category-nav',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
    template: `
        <nav class="nav">
            <div class="inner">
                <button class="cats-btn"
                        (click)="openMenu.emit()"
                        (mouseenter)="hoverMenu.emit()"
                        type="button">
                    <lucide-icon name="layout-grid" [size]="14"/> Categorías
                </button>
                @for (c of items(); track c.label) {
                    <button class="cat" [class.highlight]="c.highlight"
                            (click)="selectItem.emit(c)" type="button">
                        @if (c.highlight) {
                            <lucide-icon name="flame" [size]="14" class="flame"/>
                        }
                        {{ c.label }}
                    </button>
                }
            </div>
        </nav>
    `,
    styles: [`
        :host { display: block; }
        .nav {
            background: rgba(0,0,0,.18);
            border-top: 1px solid rgba(255,255,255,.08);
            color: var(--c-headerFg, #fff);
            font-family: var(--f-sans);
        }
        .inner {
            max-width: 1280px; margin: 0 auto;
            padding: 0 24px;
            display: flex; align-items: center; gap: 4px;
            height: 40px; overflow-x: auto;
            scrollbar-width: none;
        }
        .inner::-webkit-scrollbar { display: none; }
        .cats-btn {
            background: rgba(255,255,255,.1);
            color: inherit; border: none;
            padding: 0 14px; height: 28px;
            border-radius: var(--r-sm);
            font-size: 13px; font-weight: 700;
            display: inline-flex; align-items: center; gap: 6px;
            cursor: pointer; white-space: nowrap;
            transition: background 120ms;
        }
        .cats-btn:hover { background: rgba(255,255,255,.18); }
        .cat {
            background: transparent; border: none;
            color: inherit; padding: 0 12px; height: 28px;
            font-size: 13px; font-weight: 500;
            cursor: pointer; opacity: .92;
            display: inline-flex; align-items: center; gap: 4px;
            white-space: nowrap;
            transition: opacity 120ms, background 120ms;
            border-radius: var(--r-sm);
        }
        .cat:hover { opacity: 1; background: rgba(255,255,255,.06); }
        .cat.highlight { opacity: 1; font-weight: 700; }
        .flame { color: var(--c-accent); }
    `],
})
export class DsCategoryNavComponent {
    items = input<DsCategory[]>([
        { label: 'Más vendidos' },
        { label: 'Tecnología' },
        { label: 'Hogar' },
        { label: 'Moda' },
        { label: 'Belleza' },
        { label: 'Deportes' },
        { label: 'Niños' },
        { label: 'Ofertas del día', highlight: true },
        { label: 'Vender' },
    ]);

    selectItem = output<DsCategory>();
    openMenu = output<void>();
    hoverMenu = output<void>();
}
