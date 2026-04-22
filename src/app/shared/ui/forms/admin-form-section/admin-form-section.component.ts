import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Sección de formulario canónica — envuelve un grupo de campos con header
 * opcional y layout de grid configurable (1, 2, o 3 columnas responsive).
 *
 * Reemplaza los 3 patrones ad-hoc detectados en auditoría 2026-04-21:
 *   - margin-bottom flat sin grid
 *   - `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ...">`
 *   - `grid grid-cols-2 gap-[var(--form-gap)]`
 *
 * Uso:
 *   <app-admin-form-section title="Datos principales" [columns]="2">
 *     <app-form-field label="Nombre"><input class="form-input" /></app-form-field>
 *     <app-form-field label="Email"><input class="form-input" /></app-form-field>
 *   </app-admin-form-section>
 */
@Component({
    selector: 'app-admin-form-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    template: `
        <section class="form-section">
            @if (title()) {
                <header class="form-section-header">
                    {{ title() }}
                    @if (description()) {
                        <p class="form-section-description">{{ description() }}</p>
                    }
                </header>
            }
            <div [class]="gridClass()">
                <ng-content />
            </div>
        </section>
    `,
    styles: [
        `
            .form-section {
                display: block;
            }
            .form-section + .form-section {
                margin-top: var(--form-gap-section);
            }
            .form-section-description {
                font-size: 0.75rem;
                font-weight: 400;
                letter-spacing: 0;
                text-transform: none;
                color: var(--color-text-muted);
                margin-top: 0.25rem;
            }
        `,
    ],
})
export class AdminFormSectionComponent {
    /** Título opcional de la sección (ej: "Datos principales"). */
    title = input('');

    /** Descripción opcional bajo el título. */
    description = input('');

    /** Número de columnas en el grid responsive. 1 | 2 | 3. */
    columns = input<1 | 2 | 3>(1);

    protected gridClass = computed(() => {
        switch (this.columns()) {
            case 2:
                return 'form-group-2col';
            case 3:
                return 'form-group-3col';
            default:
                return 'form-stack-tight';
        }
    });
}
