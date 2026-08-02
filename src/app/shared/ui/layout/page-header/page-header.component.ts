import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface Breadcrumb {
    label: string;
    url?: string;
}

@Component({
    selector: 'app-page-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="ph-root">

    <!-- Breadcrumbs suprimidos globalmente (2026-07-19): el input 'breadcrumbs'
         se mantiene por compatibilidad con los callers, pero no se renderiza. -->

    <!-- Línea principal: título + acciones -->
    <div class="ph-main">
        <div class="ph-left">
            @if (showBackButton()) {
                <button type="button" class="ph-back" (click)="goBack()" title="Regresar">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <path d="M12 4L6 10l6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            }
            <div class="ph-title-group">
                <h1 class="page-title">{{ title() }}</h1>
                @if (subtitle()) {
                    <p class="page-subtitle">{{ subtitle() }}</p>
                }
                <!-- Slot para KPIs compactos del header (uso: <div meta class="header-kpis">...) -->
                <ng-content select="[meta]"></ng-content>
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
    margin-bottom: 2rem;
    position: relative;
}

/* El separador en degradado y la tipografia (.page-title/.page-subtitle) viven en
   styles/vendors/_admin-utilities.scss, como FUENTE UNICA: antes estaban duplicados aqui con
   valores distintos y el ERP mostraba dos cabeceras diferentes segun la vista. No volver a
   declararlos en este componente. */

/* Left accent accentuating the title group */
.ph-title-group {
    position: relative;
    padding-left: 0.75rem;
    display: flex;
    flex-direction: column;
}
.ph-title-group::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: linear-gradient(180deg, var(--color-primary, #2563eb) 0%, var(--color-primary-hover, #1d4ed8) 100%);
    border-radius: 4px;
}



/* ── Main row ──────────────────────────────────────── */
.ph-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
}
.ph-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* ── Back button ───────────────────────────────────── */
.ph-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 10px;
    background: var(--color-surface, #ffffff);
    color: var(--color-text-secondary, #64748b);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}
.ph-back svg { 
    width: 16px; 
    height: 16px; 
    transition: transform 0.2s;
}
.ph-back:hover {
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
    background: rgba(37, 99, 235, 0.04);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}
.ph-back:hover svg {
    transform: translateX(-2px);
}

/* ── Actions slot ──────────────────────────────────── */
.ph-actions {
    display: flex;
    align-items: center;
    gap: 10px;
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
