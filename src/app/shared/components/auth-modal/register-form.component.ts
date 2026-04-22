import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FormFieldComponent,
  AdminFormSectionComponent,
  AdminFormLayoutComponent,
} from '@shared/ui';

export interface RegisterData {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    AdminFormSectionComponent,
    AdminFormLayoutComponent,
  ],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
  private fb = inject(FormBuilder);

  /** Email que se registra (mostrado informativamente arriba del form). */
  email = input('');

  /** Emite al completar el registro. */
  register = output<RegisterData>();

  /** Emite para volver al paso anterior. */
  back = output<void>();

  readonly documentTypes = ['DNI', 'CE', 'PASAPORTE'] as const;

  loading = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    tipoDocumento: ['DNI', Validators.required],
    numeroDocumento: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
  });

  /** Placeholder dinámico según tipoDocumento. */
  documentPlaceholder = computed(() => {
    const tipo = this.form.controls.tipoDocumento.value ?? 'DNI';
    return tipo === 'DNI' ? '12345678' : 'AB1234567';
  });

  err(field: string): string {
    const c = this.form.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres`;
    return 'Campo inválido';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const v = this.form.value;
    this.register.emit({
      nombres: (v.nombres ?? '').trim(),
      apellidos: (v.apellidos ?? '').trim(),
      tipoDocumento: v.tipoDocumento ?? 'DNI',
      numeroDocumento: (v.numeroDocumento ?? '').trim(),
      fechaNacimiento: v.fechaNacimiento ?? '',
    });
  }

  goBack(): void {
    this.back.emit();
  }
}
