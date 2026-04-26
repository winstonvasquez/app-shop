import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { DsAccountShellComponent, DsButtonComponent } from '@shared/ui/ds';

@Component({
    selector: 'app-account-security',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
    ],
    templateUrl: './account-security.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityComponent {
    private fb          = inject(FormBuilder);
    private http        = inject(HttpClient);
    private authService = inject(AuthService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    saving     = signal(false);
    errorMsg   = signal('');
    successMsg = signal('');
    show1      = signal(false);
    show2      = signal(false);
    show3      = signal(false);

    passwordForm = this.fb.group(
        {
            currentPassword: ['', Validators.required],
            newPassword:     ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: this.passwordsMatchValidator() },
    );

    err(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): string {
        const c = this.passwordForm.get(field);
        if (field === 'confirmPassword' && c?.touched && this.passwordForm.hasError('mismatch')) {
            return 'Las contraseñas no coinciden.';
        }
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido.';
        if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres.`;
        return 'Campo inválido.';
    }

    onSubmit(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        this.errorMsg.set('');
        this.successMsg.set('');

        const { currentPassword, newPassword } = this.passwordForm.value;
        this.http.put(`${environment.apiUrls.users}/api/users/me/password`, { currentPassword, newPassword }).subscribe({
            next: () => {
                this.saving.set(false);
                this.successMsg.set('Contraseña actualizada correctamente.');
                this.passwordForm.reset();
            },
            error: (err) => {
                this.saving.set(false);
                const httpErr = err as { error?: { message?: string } };
                this.errorMsg.set(httpErr.error?.message ?? 'Error al cambiar la contraseña.');
            },
        });
    }

    private passwordsMatchValidator(): ValidatorFn {
        return (group: AbstractControl): ValidationErrors | null => {
            const pwd = group.get('newPassword')?.value;
            const confirm = group.get('confirmPassword')?.value;
            if (!pwd || !confirm) return null;
            return pwd === confirm ? null : { mismatch: true };
        };
    }
}
