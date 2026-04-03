import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { DrawerComponent } from '../../../../../../shared/components/drawer/drawer.component';
import { RolDto, TIPO_DOCUMENTO_OPTIONS } from '@features/admin/models/user.model';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [ReactiveFormsModule, DrawerComponent],
    templateUrl: './user-form.component.html',
    styleUrl: './user-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
    isOpen     = input(false);
    formGroup  = input.required<FormGroup>();
    roles      = input.required<RolDto[]>();
    editMode   = input.required<boolean>();
    submitting = input.required<boolean>();
    submitError = input<string | null>(null);

    save   = output<void>();
    cancel = output<void>();

    tipoDocumentoOptions = TIPO_DOCUMENTO_OPTIONS;

    /** Fecha máxima para el campo fechaNacimiento (hoy en formato yyyy-MM-dd) */
    todayISO = computed(() => new Date().toISOString().split('T')[0]);

    getErrorMessage(controlName: string): string {
        const control = this.formGroup().get(controlName);
        if (!control || !control.errors || !control.touched) return '';

        if (control.errors['required']) return 'Este campo es obligatorio';
        if (control.errors['email']) return 'Email inválido';
        if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
        if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;

        return 'Campo inválido';
    }

    hasError(controlName: string): boolean {
        const control = this.formGroup().get(controlName);
        return !!(control && control.invalid && control.touched);
    }
}
