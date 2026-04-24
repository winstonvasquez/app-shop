import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Campo de formulario canónico — label + input (proyectado o propio) + mensaje de error.
 *
 * Dos modos de uso:
 *
 * 1. Con [control] (auto-render del input):
 *    <app-form-field label="Nombre" [control]="getControl('nombre')" [required]="true" />
 *
 * 2. Con [error] + content projection (patrón canónico 2026-04-21):
 *    <app-form-field label="Nombre" [required]="true" [error]="err('nombre')">
 *      <input formControlName="nombre" class="form-input" />
 *    </app-form-field>
 */
@Component({
    selector: 'app-form-field',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './form-field.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
    label = input.required<string>();
    /** FormControl para auto-render del input (modo 1). Opcional si se usa content projection. */
    control = input<FormControl | null>(null);
    type = input<string>('text');
    placeholder = input<string>('');
    hint = input<string>('');
    required = input<boolean>(false);
    disabled = input<boolean>(false);
    /** Mensaje de error externo (modo 2, content projection). Tiene precedencia sobre control errors. */
    error = input<string>('');

    id = computed(() => `field-${Math.random().toString(36).substr(2, 9)}`);

    /** True si hay error externo vía [error] input */
    protected hasExternalError = computed(() => !!this.error());

    /** True si hay error en el control interno */
    protected hasControlError = computed(() => {
        const ctrl = this.control();
        return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
    });

    protected hasError = computed(() => this.hasExternalError() || this.hasControlError());

    protected errorMessage = computed(() => {
        // Error externo (string) tiene precedencia
        if (this.hasExternalError()) return this.error();

        const ctrl = this.control();
        if (!ctrl || !this.hasControlError()) return '';

        const errors = ctrl.errors;
        if (!errors) return '';

        if (errors['required']) return 'Este campo es requerido';
        if (errors['email']) return 'Email inválido';
        if (errors['minlength']) {
            return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        }
        if (errors['maxlength']) {
            return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
        }
        if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
        if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
        if (errors['pattern']) return 'Formato inválido';

        return 'Campo inválido';
    });
}
