import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DsThumbComponent } from '../ds-thumb/ds-thumb.component';

export interface DsCategoryTile {
    name: string;
    tone?: number;
    count?: number;
    image?: string;
}

/**
 * Category Tile — tarjeta de categoría con thumb + nombre + contador.
 * Diseño elevado: imagen full-bleed, gradient overlay sutil para legibilidad
 * del nombre, hover con lift + brillo, accent inferior con color de marca.
 */
@Component({
    selector: 'ds-category-tile',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DsThumbComponent],
    template: `
        <div class="tile">
            <div class="media">
                <ds-thumb
                    [label]="c().name"
                    [tone]="c().tone ?? 0"
                    [ratio]="1.4"
                    [src]="c().image ?? null"/>
                <div class="overlay"></div>
            </div>
            <div class="body">
                <div class="name">{{ c().name }}</div>
                @if (c().count !== undefined) {
                    <div class="count">
                        <span class="dot"></span>
                        {{ formattedCount() }} productos
                    </div>
                }
            </div>
            <span class="accent" aria-hidden="true"></span>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            /* Baseline IGUAL al filter-item: 13px / 400 / --c-text */
            font: 400 13px/1.4 var(--f-sans);
            color: var(--c-text);
        }
        .tile {
            position: relative;
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            overflow: hidden;
            display: flex; flex-direction: column;
            cursor: pointer;
            transition: transform 200ms cubic-bezier(0,0,.2,1),
                        box-shadow 200ms cubic-bezier(0,0,.2,1),
                        border-color 200ms cubic-bezier(0,0,.2,1);
        }
        .tile:hover {
            transform: translateY(-4px);
            box-shadow: var(--s-lg);
            border-color: var(--c-brand);
        }

        .media { position: relative; overflow: hidden; }
        .media :deep(.thumb) { transition: transform 400ms cubic-bezier(0,0,.2,1); }
        .tile:hover .media :deep(.thumb) { transform: scale(1.05); }
        .overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top,
                rgba(0,0,0,.18) 0%,
                rgba(0,0,0,0) 35%);
            pointer-events: none;
        }

        .body {
            padding: 12px 14px 14px;
            display: flex; flex-direction: column; gap: 4px;
        }
        .name {
            /* match al filter-item: 13px / 400 / --c-text */
            font-size: 13px; font-weight: 500; color: var(--c-text);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .count {
            font-size: 13px; color: var(--c-muted);
            display: inline-flex; align-items: center; gap: 6px;
        }
        .dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: var(--c-brand); flex-shrink: 0;
        }

        /* accent line en hover */
        .accent {
            position: absolute; bottom: 0; left: 0; right: 0;
            height: 3px; background: var(--c-brand);
            transform: scaleX(0); transform-origin: left;
            transition: transform 240ms cubic-bezier(0,0,.2,1);
        }
        .tile:hover .accent { transform: scaleX(1); }
    `],
})
export class DsCategoryTileComponent {
    c = input.required<DsCategoryTile>();

    protected formattedCount(): string {
        const n = this.c().count;
        return n !== undefined ? n.toLocaleString('es-PE') : '';
    }
}
