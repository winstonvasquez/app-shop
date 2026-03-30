import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './account-security.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSecurityComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Mi Cuenta' },
    { label: 'Seguridad' }
  ];

  saving = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  get passwordsMatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.value;
    return newPassword === confirmPassword;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) return;
    if (!this.passwordsMatch) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }
    this.saving.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.http.put(`${environment.apiUrls.users}/api/users/me/password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Contraseña actualizada correctamente.');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al cambiar la contraseña.');
      }
    });
  }
}
