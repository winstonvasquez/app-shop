import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DsThumbComponent } from '../ds-thumb/ds-thumb.component';

export interface DsCategoryTile {
    name: string;
    tone?: number;
    count?: number;
    image?: string;
}

/**
 * Category Tile — tarjetita de categoría (thumb + nombre + count).
 * Port 1:1 de product-card.jsx → function CategoryTile({ c })
 */
@Component({
    selector: 'ds-category-tile',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DsThumbComponent],
    template: `
        <div class="tile">
            <ds-thumb [label]="c().name" [tone]="c().tone ?? 0" [ratio]="1.4" [src]="c().image ?? null"/>
            <div>
                <div class="name">{{ c().name }}</div>
                @if (c().count !== undefined) {
                    <div class="count">{{ formattedCount() }} productos</div>
                }
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .tile {
            background: var(--c-surface);
            border: 1px solid var(--c-border);
            border-radius: var(--r-lg);
            padding: var(--p-card);
            display: flex; flex-direction: column; gap: 8px;
            cursor: pointer;
            transition: transform 120ms, box-shadow 120ms;
            font-family: var(--f-sans);
        }
        .tile:hover { transform: translateY(-2px); box-shadow: var(--s-md); }
        .name { font-size: 14px; font-weight: 700; color: var(--c-text); }
        .count { font-size: 12px; color: var(--c-muted); }
    `],
})
export class DsCategoryTileComponent {
    c = input.required<DsCategoryTile>();

    protected formattedCount(): string {
        const n = this.c().count;
        return n !== undefined ? n.toLocaleString('es-PE') : '';
    }
}
