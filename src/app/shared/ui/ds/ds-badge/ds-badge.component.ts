import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

export type DsBadgeTone =
    | 'neutral' | 'brand' | 'accent' | 'accent2'
    | 'success' | 'danger' | 'warn' | 'info' | 'outline';
export type DsBadgeSize = 'xs' | 'sm' | 'md';

/**
 * Badge — pill/tag con tonos semánticos.
 * Port 1:1 de primitives.jsx → function Badge({ tone, size, children })
 */
@Component({
    selector: 'ds-badge',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<span [style]="styles()"><ng-content/></span>`,
    styles: [`
        :host { display: inline-flex; }
        span {
            display: inline-flex; align-items: center; gap: 4px;
            border-radius: var(--r-sm); font-weight: 700;
            letter-spacing: .02em; text-transform: uppercase;
            font-family: var(--f-sans);
        }
    `],
})
export class DsBadgeComponent {
    tone = input<DsBadgeTone>('neutral');
    size = input<DsBadgeSize>('sm');

    protected styles = computed(() => {
        const tones: Record<DsBadgeTone, { bg: string; fg: string; bd?: string }> = {
            neutral: { bg: 'var(--c-surface2)', fg: 'var(--c-text)' },
            brand:   { bg: 'var(--c-brand)',    fg: 'var(--c-onBrand,#fff)' },
            accent:  { bg: 'var(--c-accent)',   fg: 'var(--c-onAccent,#1a1a1a)' },
            accent2: { bg: 'var(--c-accent2)',  fg: '#fff' },
            success: { bg: 'var(--c-success)',  fg: '#fff' },
            danger:  { bg: 'var(--c-danger)',   fg: '#fff' },
            warn:    { bg: 'var(--c-warn)',     fg: '#fff' },
            info:    { bg: 'var(--c-info)',     fg: '#fff' },
            outline: { bg: 'transparent', fg: 'var(--c-text)', bd: 'var(--c-border)' },
        };
        const sizes: Record<DsBadgeSize, { h: number; px: number; fs: number }> = {
            xs: { h: 18, px: 5, fs: 10 },
            sm: { h: 22, px: 8, fs: 11 },
            md: { h: 26, px: 10, fs: 12 },
        };
        const t = tones[this.tone()];
        const s = sizes[this.size()];
        return {
            height: `${s.h}px`,
            padding: `0 ${s.px}px`,
            background: t.bg,
            color: t.fg,
            border: t.bd ? `1px solid ${t.bd}` : 'none',
            fontSize: `${s.fs}px`,
        };
    });
}
