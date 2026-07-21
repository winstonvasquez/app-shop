import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Thumb — placeholder image con gradient + iniciales (no broken-link feel).
 * Port 1:1 de primitives.jsx → function Thumb({ label, tone, ratio, badge })
 * Soporta slot `[badge]` para overlay top-left.
 */
@Component({
    selector: 'ds-thumb',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="thumb" [style]="containerStyle()">
            @if (src(); as s) {
                <img [src]="s" [alt]="label()" loading="lazy" class="img" [class.full-bleed]="fullBleed()"/>
                <div class="thumb-overlay"></div>
            } @else {
                <span class="mark">{{ initials() }}</span>
            }
            <div class="badge-slot"><ng-content select="[ds-thumb-badge]"/></div>
        </div>
    `,
    styles: [`
        :host { display: block; }
        .thumb {
            position: relative;
            border-radius: var(--r-md);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
        }
        .img {
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: contain; padding: 8%;
            mix-blend-mode: var(--c-image-blend, multiply);
            transition: transform 0.4s cubic-bezier(0,0,.2,1);
        }
        .img.full-bleed {
            object-fit: cover;
            padding: 0;
            mix-blend-mode: normal;
        }
        .thumb-overlay {
            position: absolute; inset: 0;
            pointer-events: none;
            background: radial-gradient(circle, transparent 65%, rgba(0, 0, 0, 0.04) 100%);
            z-index: 1;
        }
        .mark {
            font-family: var(--f-display);
            font-size: 36px; font-weight: 800;
            color: rgba(0,0,0,.18);
            letter-spacing: -.04em;
        }
        .badge-slot {
            position: absolute; top: 8px; left: 8px;
            z-index: 2;
        }
    `],
})
export class DsThumbComponent {
    label = input<string>('');
    tone = input<number>(0);
    ratio = input<number>(1);
    src = input<string | null>(null);
    fullBleed = input<boolean>(false);

    private readonly palette = [
        'linear-gradient(135deg,#FFE0B0,#FFC189)',
        'linear-gradient(135deg,#D4E5C8,#A6CC9A)',
        'linear-gradient(135deg,#C5D6E8,#94B3D1)',
        'linear-gradient(135deg,#F2C9C9,#E69E9E)',
        'linear-gradient(135deg,#E5D5F0,#C5A8E0)',
        'linear-gradient(135deg,#FFF1AA,#F5D24C)',
        'linear-gradient(135deg,#D7CCC8,#A1887F)',
        'linear-gradient(135deg,#B2DFDB,#80CBC4)',
    ];

    protected initials = computed(() => {
        const text = (this.label() || '').trim();
        if (!text) return '◆';
        return text.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
    });

    protected containerStyle = computed(() => ({
        aspectRatio: `${this.ratio()}`,
        background: this.palette[this.tone() % this.palette.length],
    }));
}
