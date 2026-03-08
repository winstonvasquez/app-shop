
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RolDto, TIPO_DOCUMENTO_OPTIONS } from '@features/admin/models/user.model';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './user-form.component.html',
    styleUrl: './user-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
    formGroup = input.required<FormGroup>();
    roles = input.required<RolDto[]>();
    editMode = input.required<boolean>();
    submitting = input.required<boolean>();
    submitError = input<string | null>(null);

    save = output<void>();
    cancel = output<void>();

    tipoDocumentoOptions = TIPO_DOCUMENTO_OPTIONS;

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
