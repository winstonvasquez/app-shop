import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { DireccionEnvio } from '@core/models/order.model';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@shared/components';
import {
  FormFieldComponent,
  AdminFormSectionComponent,
  AdminFormLayoutComponent,
} from '@shared/ui';

interface DireccionResponse extends DireccionEnvio {
  id: number;
  predeterminada?: boolean;
}

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonComponent,
    FormFieldComponent,
    AdminFormSectionComponent,
    AdminFormLayoutComponent,
  ],
  templateUrl: './account-addresses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAddressesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Mi Cuenta' },
    { label: 'Mis Direcciones' }
  ];

  addresses = signal<DireccionResponse[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  submitError = signal('');

  addressForm = this.fb.group({
    nombreDestinatario: ['', Validators.required],
    telefono: ['', Validators.required],
    direccion: ['', Validators.required],
    ciudad: ['', Validators.required],
    region: [''],
    codigoPostal: [''],
  });

  ngOnInit(): void {
    this.loadAddresses();
  }

  err(field: string): string {
    const c = this.addressForm.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    if (c.hasError('email')) return 'Email inválido';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres`;
    if (c.hasError('pattern')) return 'Formato inválido';
    return 'Campo inválido';
  }

  loadAddresses(): void {
    this.loading.set(true);
    this.http.get<DireccionResponse[]>(`${environment.apiUrls.users}/api/users/me/addresses`).subscribe({
      next: (list) => { this.addresses.set(list); this.loading.set(false); },
      error: () => { this.addresses.set([]); this.loading.set(false); }
    });
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.addressForm.reset();
    this.showForm.set(true);
  }

  openEditForm(addr: DireccionResponse): void {
    this.editingId.set(addr.id);
    this.addressForm.patchValue({
      nombreDestinatario: addr.nombreDestinatario ?? '',
      telefono: addr.telefono ?? '',
      direccion: addr.direccion,
      ciudad: addr.ciudad,
      region: addr.region ?? '',
      codigoPostal: addr.codigoPostal ?? '',
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.submitError.set('');
  }

  onSubmit(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.submitError.set('');
    const body = this.addressForm.value;
    const id = this.editingId();

    const request = id
      ? this.http.put(`${environment.apiUrls.users}/api/users/me/addresses/${id}`, body)
      : this.http.post(`${environment.apiUrls.users}/api/users/me/addresses`, body);

    request.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.loadAddresses(); },
      error: (err) => {
        this.saving.set(false);
        this.submitError.set(err?.error?.message ?? 'Error al guardar la dirección.');
      }
    });
  }

  deleteAddress(id: number): void {
    if (!confirm('¿Eliminar esta dirección?')) return;
    this.http.delete(`${environment.apiUrls.users}/api/users/me/addresses/${id}`).subscribe({
      next: () => this.loadAddresses(),
      error: () => this.submitError.set('Error al eliminar la dirección. Inténtalo de nuevo.')
    });
  }
}
