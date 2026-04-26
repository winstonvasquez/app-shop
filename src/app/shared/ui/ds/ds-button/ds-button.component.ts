import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export type DsButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type DsButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button — 6 variantes × 4 tamaños. Port 1:1 de primitives.jsx → function Button.
 * Admite icon (izquierda) + iconRight por name Lucide o via <ng-content>.
 */
@Component({
    selector: 'ds-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LucideAngularModule],
    host: {
        '[class.is-full]': 'full()',
    },
    template: `
        <button
            [type]="type()"
            [disabled]="disabled()"
            [style]="styles()"
            (click)="click.emit($event)">
            @if (icon()) { <lucide-icon [name]="icon()!" [size]="iconSize()"/> }
            <span class="lbl"><ng-content/></span>
            @if (iconRight()) { <lucide-icon [name]="iconRight()!" [size]="iconSize()"/> }
        </button>
    `,
    styles: [`
        :host { display: inline-flex; }
        :host(.is-full) { display: flex; width: 100%; }
        :host(.is-full) button { width: 100%; }
        button {
            border-radius: var(--r-md);
            font-weight: 600;
            font-family: var(--f-sans);
            display: inline-flex;
            align-items: center; justify-content: center;
            white-space: nowrap;
            transition: background 120ms, transform 80ms, filter 120ms;
        }
        button:not(:disabled):hover { filter: brightness(1.06); }
        button:not(:disabled):active { transform: translateY(1px); }
        button:disabled { cursor: not-allowed; opacity: .5; }
        .lbl:empty { display: none; }
    `],
})
export class DsButtonComponent {
    variant = input<DsButtonVariant>('primary');
    size = input<DsButtonSize>('md');
    type = input<'button' | 'submit' | 'reset'>('button');
    disabled = input<boolean>(false);
    full = input<boolean>(false);
    icon = input<string | null>(null);
    iconRight = input<string | null>(null);
    click = output<MouseEvent>();

    protected iconSize = computed(() => {
        const map: Record<DsButtonSize, number> = { sm: 14, md: 16, lg: 18, xl: 20 };
        return map[this.size()];
    });

    protected styles = computed(() => {
        const sizes: Record<DsButtonSize, { h: number; px: number; fs: number; gap: number }> = {
            sm: { h: 32, px: 12, fs: 13, gap: 6 },
            md: { h: 40, px: 16, fs: 14, gap: 8 },
            lg: { h: 48, px: 20, fs: 16, gap: 10 },
            xl: { h: 56, px: 28, fs: 17, gap: 10 },
        };
        const variants: Record<DsButtonVariant, { bg: string; fg: string; bd: string }> = {
            primary:   { bg: 'var(--c-brand)',   fg: 'var(--c-onBrand, #fff)',        bd: 'transparent' },
            accent:    { bg: 'var(--c-accent)',  fg: 'var(--c-onAccent, #1a1a1a)',    bd: 'transparent' },
            secondary: { bg: 'var(--c-surface)', fg: 'var(--c-text)',                 bd: 'var(--c-border)' },
            ghost:     { bg: 'transparent',      fg: 'var(--c-text)',                 bd: 'transparent' },
            outline:   { bg: 'transparent',      fg: 'var(--c-brand)',                bd: 'var(--c-brand)' },
            danger:    { bg: 'var(--c-danger)',  fg: '#fff',                          bd: 'transparent' },
        };
        const s = sizes[this.size()];
        const v = variants[this.variant()];
        return {
            height: `${s.h}px`,
            padding: `0 ${s.px}px`,
            fontSize: `${s.fs}px`,
            gap: `${s.gap}px`,
            background: v.bg,
            color: v.fg,
            border: `1px solid ${v.bd}`,
            cursor: 'pointer',
        };
    });
}
