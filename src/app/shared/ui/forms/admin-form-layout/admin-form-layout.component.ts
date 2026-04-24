import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Layout canónico para formularios admin — envuelve secciones +
 * área de error global + barra de acciones (submit/cancel).
 *
 * Reemplaza los patrones ad-hoc detectados en auditoría 2026-04-21:
 *   - Error cards inline con `<div class="card" style="border-left: 3px ...">`
 *   - Footer manual en drawers `<div style="display: flex; ...">`
 *   - Mezcla de `[hasFooter]="true"` en unos forms y slots manuales en otros
 *
 * Slots:
 *   - default: contenido del form (secciones)
 *   - `[slot=error]`: error global opcional (o usar `errorMessage` input)
 *   - `[slot=actions]`: botones de submit/cancel
 *
 * Uso:
 *   <form [formGroup]="form" (ngSubmit)="onSubmit()">
 *     <app-admin-form-layout [errorMessage]="submitError()">
 *       <app-admin-form-section title="Datos principales" [columns]="2">
 *         ...
 *       </app-admin-form-section>
 *       <app-admin-form-section title="Contacto" [columns]="2">
 *         ...
 *       </app-admin-form-section>
 *       <div slot="actions">
 *         <button type="button" class="btn btn-secondary" (click)="cancel()">Cancelar</button>
 *         <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
 *           {{ saving() ? 'Guardando...' : 'Guardar' }}
 *         </button>
 *       </div>
 *     </app-admin-form-layout>
 *   </form>
 */
@Component({
    selector: 'app-admin-form-layout',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    template: `
        <div class="admin-form-layout form-stack">
            @if (errorMessage()) {
                <div class="admin-form-error" role="alert">
                    <span aria-hidden="true">⚠</span>
                    <span>{{ errorMessage() }}</span>
                </div>
            }
            <ng-content select="[slot=error]" />
            <div class="admin-form-body">
                <ng-content />
            </div>
            <div class="admin-form-actions" [class.sticky]="stickyActions()">
                <ng-content select="[slot=actions]" />
            </div>
        </div>
    `,
    styles: [
        `
            .admin-form-layout {
                width: 100%;
            }
            .admin-form-body {
                display: flex;
                flex-direction: column;
                gap: var(--form-gap-section);
            }
            .admin-form-error {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: color-mix(in oklch, var(--color-error) 8%, transparent);
                border-left: 3px solid var(--color-error);
                border-radius: var(--radius-md, 0.5rem);
                color: var(--color-error);
                font-size: 0.875rem;
                font-weight: 500;
            }
            .admin-form-actions {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: var(--form-gap);
                padding-top: var(--form-gap-section);
                border-top: 1px solid var(--color-border);
                margin-top: var(--form-gap-section);
            }
            .admin-form-actions.sticky {
                position: sticky;
                bottom: 0;
                background: var(--color-surface);
                z-index: 10;
                padding-bottom: var(--form-gap);
            }
            /* Si no hay nodos proyectados en actions, oculta la barra */
            .admin-form-actions:empty {
                display: none;
            }
        `,
    ],
})
export class AdminFormLayoutComponent {
    /** Mensaje de error global opcional — se muestra arriba del form. */
    errorMessage = input('');

    /** Si es true, la barra de acciones queda sticky al scroll del form. */
    stickyActions = input(false);
}
