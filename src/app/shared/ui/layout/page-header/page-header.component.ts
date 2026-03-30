import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Breadcrumb {
    label: string;
    url?: string;
}

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="ph-root">

    <!-- Breadcrumbs -->
    @if (breadcrumbs().length > 0) {
        <nav class="ph-breadcrumbs" aria-label="Navegación">
            @for (crumb of breadcrumbs(); track $index) {
                @if ($index > 0) {
                    <svg class="ph-bc-sep" viewBox="0 0 6 10" fill="none">
                        <path d="M1 1l4 4-4 4" stroke="currentColor" stroke-width="1.5"
                              stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                }
                @if (crumb.url) {
                    <a [routerLink]="crumb.url" class="ph-bc-link">{{ crumb.label }}</a>
                } @else {
                    <span class="ph-bc-current">{{ crumb.label }}</span>
                }
            }
        </nav>
    }

    <!-- Línea principal: título + acciones -->
    <div class="ph-main">
        <div class="ph-left">
            @if (showBackButton()) {
                <button type="button" class="ph-back" (click)="goBack()">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <path d="M12 4L6 10l6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            }
            <div>
                <h1 class="page-title">{{ title() }}</h1>
                @if (subtitle()) {
                    <p class="page-subtitle">{{ subtitle() }}</p>
                }
            </div>
        </div>

        <!-- Slot para botones de acción (uso: <div actions>...</div>) -->
        <div class="ph-actions">
            <ng-content select="[actions]"></ng-content>
        </div>
    </div>

</div>
    `,
    styles: [`
:host { display: block; }

/* ── Root ─────────────────────────────────────────── */
.ph-root {
    padding-bottom: 1.25rem;
    margin-bottom: 1.75rem;
    border-bottom: 1px solid var(--color-border);
    position: relative;
}
.ph-root::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 2.5rem;
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
}

/* ── Breadcrumbs ───────────────────────────────────── */
.ph-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 6px;
    font-size: 12px;
}
.ph-bc-sep {
    width: 6px;
    height: 10px;
    color: var(--color-text-muted);
    opacity: 0.5;
    flex-shrink: 0;
}
.ph-bc-link {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.15s;
}
.ph-bc-link:hover { color: var(--color-primary); }
.ph-bc-current {
    color: var(--color-text-secondary);
    font-weight: 500;
}

/* ── Main row ──────────────────────────────────────── */
.ph-main {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
}
.ph-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* ── Back button ───────────────────────────────────── */
.ph-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color .15s, color .15s;
    flex-shrink: 0;
}
.ph-back svg { width: 18px; height: 18px; }
.ph-back:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

/* ── Actions slot ──────────────────────────────────── */
.ph-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
    `]
})
export class PageHeaderComponent {
    title         = input.required<string>();
    subtitle      = input<string>('');
    breadcrumbs   = input<Breadcrumb[]>([]);
    showBackButton = input<boolean>(false);

    goBack(): void {
        history.back();
    }
}
