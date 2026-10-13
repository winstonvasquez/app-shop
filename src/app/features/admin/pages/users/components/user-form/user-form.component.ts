import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { DrawerComponent } from '../../../../../../shared/components/drawer/drawer.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { RolDto } from '@features/admin/models/user.model';
import { mensajeDeErrorDeControl } from '@shared/utils/form-errors';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [ReactiveFormsModule, DrawerComponent, ButtonComponent, CatalogSelectComponent],
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

    /** Fecha máxima para el campo fechaNacimiento (hoy en formato yyyy-MM-dd) */
    todayISO = computed(() => new Date().toISOString().split('T')[0]);

    getErrorMessage(controlName: string): string {
        const control = this.formGroup().get(controlName);
        return !control?.touched ? '' : mensajeDeErrorDeControl(control);
    }

    hasError(controlName: string): boolean {
        const control = this.formGroup().get(controlName);
        return !!(control && control.invalid && control.touched);
    }
}
