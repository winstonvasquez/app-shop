import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@shared/components';
import {
  FormFieldComponent,
  AdminFormSectionComponent,
  AdminFormLayoutComponent,
  AlertComponent,
} from '@shared/ui';

interface UserProfile {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  fechaNacimiento?: string;
}

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonComponent,
    FormFieldComponent,
    AdminFormSectionComponent,
    AdminFormLayoutComponent,
    AlertComponent,
  ],
  templateUrl: './account-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Mi Cuenta' },
    { label: 'Mi Perfil' }
  ];

  loading = signal(true);
  saving = signal(false);
  submitError = signal('');
  successMsg = signal('');

  profileForm = this.fb.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    telefono: [''],
    tipoDocumento: ['DNI'],
    numeroDocumento: [''],
    fechaNacimiento: [''],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  err(field: string): string {
    const c = this.profileForm.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    if (c.hasError('email')) return 'Email inválido';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres`;
    if (c.hasError('pattern')) return 'Formato inválido';
    return 'Campo inválido';
  }

  loadProfile(): void {
    this.loading.set(true);
    this.http.get<UserProfile>(`${environment.apiUrls.users}/api/users/me`).subscribe({
      next: (profile) => {
        this.profileForm.patchValue({
          nombres: profile.nombres,
          apellidos: profile.apellidos,
          email: profile.email,
          telefono: profile.telefono ?? '',
          tipoDocumento: profile.tipoDocumento ?? 'DNI',
          numeroDocumento: profile.numeroDocumento ?? '',
          fechaNacimiento: profile.fechaNacimiento ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        // Si no hay endpoint /me, mostrar datos del token
        const user = this.authService.currentUser();
        if (user) {
          this.profileForm.patchValue({ nombres: user.username, apellidos: '' });
        }
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.submitError.set('');
    this.successMsg.set('');

    const body = this.profileForm.getRawValue();
    this.http.put(`${environment.apiUrls.users}/api/users/me`, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Perfil actualizado correctamente.');
      },
      error: (err) => {
        this.saving.set(false);
        this.submitError.set(err?.error?.message ?? 'Error al guardar el perfil.');
      }
    });
  }
}
