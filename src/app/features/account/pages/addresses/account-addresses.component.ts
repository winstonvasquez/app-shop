import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { Address, AddressInput, AddressService } from '@core/services/address/address.service';
import {
    DsAccountShellComponent,
    DsButtonComponent,
    DsBadgeComponent,
} from '@shared/ui/ds';
import { mensajeDeErrorDeControl } from '@shared/utils/form-errors';

@Component({
    selector: 'app-account-addresses',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
        DsBadgeComponent,
    ],
    templateUrl: './account-addresses.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAddressesComponent implements OnInit {
    private fb             = inject(FormBuilder);
    private addressService = inject(AddressService);
    private authService    = inject(AuthService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    addresses    = signal<Address[]>([]);
    loading      = signal(true);
    saving       = signal(false);
    showForm     = signal(false);
    editingId    = signal<number | null>(null);
    submitError  = signal('');
    loadError    = signal('');

    // Mismos campos que acepta `/sales/api/clientes/me/direcciones` (ClienteDireccionRequestDto).
    // Sin código postal: el backend no lo guarda (regla 5: no prometer lo que no se persiste).
    addressForm = this.fb.group({
        nombreDestinatario:   ['', Validators.required],
        telefonoDestinatario: ['', Validators.required],
        direccion:            ['', Validators.required],
        departamento:         ['', Validators.required],
        provincia:            ['', Validators.required],
        distrito:             ['', Validators.required],
        referencia:           [''],
        esPrincipal:          [false],
    });

    ngOnInit(): void { this.loadAddresses(); }

    err(field: string): string {
        const c = this.addressForm.get(field);
        return !c || c.pristine || c.valid ? '' : mensajeDeErrorDeControl(c);
    }

    loadAddresses(): void {
        this.loading.set(true);
        this.loadError.set('');
        this.addressService.getMyAddresses().subscribe({
            next: (list) => { this.addresses.set(list); this.loading.set(false); },
            error: (err: Error) => {
                this.addresses.set([]);
                this.loadError.set(err.message);
                this.loading.set(false);
            },
        });
    }

    openAddForm(): void {
        this.editingId.set(null);
        this.submitError.set('');
        this.addressForm.reset({ esPrincipal: false });
        this.showForm.set(true);
    }

    openEditForm(addr: Address): void {
        this.editingId.set(addr.id);
        this.submitError.set('');
        this.addressForm.patchValue({
            nombreDestinatario:   addr.nombreDestinatario ?? '',
            telefonoDestinatario: addr.telefonoDestinatario ?? '',
            direccion:            addr.direccion,
            departamento:         addr.departamento,
            provincia:            addr.provincia,
            distrito:             addr.distrito,
            referencia:           addr.referencia ?? '',
            esPrincipal:          addr.esPrincipal,
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
        const raw = this.addressForm.getRawValue();
        const body: AddressInput = {
            nombreDestinatario:   raw.nombreDestinatario ?? '',
            telefonoDestinatario: raw.telefonoDestinatario ?? '',
            direccion:            raw.direccion ?? '',
            departamento:         raw.departamento ?? '',
            provincia:            raw.provincia ?? '',
            distrito:             raw.distrito ?? '',
            referencia:           raw.referencia ?? '',
            esPrincipal:          raw.esPrincipal ?? false,
        };
        const id = this.editingId();

        const request = id
            ? this.addressService.updateAddress(id, body)
            : this.addressService.addAddress(body);

        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                this.editingId.set(null);
                this.loadAddresses();
            },
            error: (err: Error) => {
                this.saving.set(false);
                this.submitError.set(err.message);
            },
        });
    }

    deleteAddress(id: number): void {
        if (!confirm('¿Eliminar esta dirección?')) return;
        this.addressService.deleteAddress(id).subscribe({
            next: () => this.loadAddresses(),
            error: (err: Error) => this.loadError.set(err.message),
        });
    }
}
