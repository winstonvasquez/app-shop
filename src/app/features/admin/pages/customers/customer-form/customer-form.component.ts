import {
    Component, ChangeDetectionStrategy, inject, signal, input, output, effect
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { CustomerService } from '@features/admin/services/customer.service';
import { AuthService } from '@core/auth/auth.service';
import {
    CustomerResponse,
    CustomerRequest,
    TIPO_CLIENTE_OPTIONS,
    TIPO_DOCUMENTO_OPTIONS,
    CONDICION_PAGO_OPTIONS,
} from '@features/admin/models/customer.model';

@Component({
    selector: 'app-customer-form',
    standalone: true,
    imports: [ReactiveFormsModule, DrawerComponent],
    templateUrl: './customer-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormComponent {
    private readonly fb = inject(FormBuilder);
    private readonly customerService = inject(CustomerService);
    private readonly authService = inject(AuthService);

    isOpen = input(false);
    customer = input<CustomerResponse | null>(null);

    saved = output<void>();
    cancel = output<void>();

    submitting = signal(false);
    submitError = signal<string | null>(null);

    tipoClienteOptions = TIPO_CLIENTE_OPTIONS;
    tipoDocumentoOptions = TIPO_DOCUMENTO_OPTIONS;
    condicionPagoOptions = CONDICION_PAGO_OPTIONS;

    form: FormGroup = this.fb.group({
        tipoCliente: ['PERSONA_NATURAL', Validators.required],
        tipoDocumento: ['DNI', Validators.required],
        numeroDocumento: ['', [Validators.required, Validators.maxLength(20)]],
        nombres: ['', [Validators.required, Validators.maxLength(100)]],
        apellidos: ['', Validators.maxLength(100)],
        razonSocial: ['', Validators.maxLength(200)],
        nombreComercial: ['', Validators.maxLength(200)],
        email: ['', [Validators.email, Validators.maxLength(100)]],
        telefono: ['', Validators.maxLength(20)],
        celular: ['', Validators.maxLength(20)],
        condicionPago: ['CONTADO'],
        limiteCredito: [0, [Validators.min(0)]],
        notas: [''],
    });

    isJuridica = signal(false);

    constructor() {
        effect(() => {
            const c = this.customer();
            if (c) {
                this.form.patchValue({
                    tipoCliente: c.tipoCliente,
                    tipoDocumento: c.tipoDocumento,
                    numeroDocumento: c.numeroDocumento,
                    nombres: c.nombres,
                    apellidos: c.apellidos,
                    razonSocial: c.razonSocial,
                    nombreComercial: c.nombreComercial,
                    email: c.email,
                    telefono: c.telefono,
                    celular: c.celular,
                    condicionPago: c.condicionPago,
                    limiteCredito: c.limiteCredito,
                    notas: c.notas,
                });
                this.isJuridica.set(c.tipoCliente === 'PERSONA_JURIDICA');
            } else {
                this.form.reset({
                    tipoCliente: 'PERSONA_NATURAL',
                    tipoDocumento: 'DNI',
                    condicionPago: 'CONTADO',
                    limiteCredito: 0,
                });
                this.isJuridica.set(false);
            }
            this.submitError.set(null);
        });
    }

    onTipoClienteChange(value: string): void {
        this.isJuridica.set(value === 'PERSONA_JURIDICA');
        if (value === 'PERSONA_JURIDICA') {
            this.form.patchValue({ tipoDocumento: 'RUC' });
        }
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const companyId = this.authService.currentUser()?.activeCompanyId ?? null;
        if (!companyId) {
            this.submitError.set('No se pudo determinar la empresa activa');
            this.submitting.set(false);
            return;
        }

        const v = this.form.value;
        const dto: CustomerRequest = {
            companyId,
            tipoCliente: v.tipoCliente,
            tipoDocumento: v.tipoDocumento,
            numeroDocumento: v.numeroDocumento,
            nombres: v.nombres,
            apellidos: v.apellidos || null,
            razonSocial: v.razonSocial || null,
            nombreComercial: v.nombreComercial || null,
            email: v.email || null,
            telefono: v.telefono || null,
            celular: v.celular || null,
            condicionPago: v.condicionPago || 'CONTADO',
            limiteCredito: v.limiteCredito || 0,
            notas: v.notas || null,
        };

        const op = this.customer()
            ? this.customerService.update(this.customer()!.id, dto)
            : this.customerService.create(dto);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.saved.emit();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            },
        });
    }

    hasError(name: string): boolean {
        const ctrl = this.form.get(name);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }

    getError(name: string): string {
        const ctrl = this.form.get(name);
        if (!ctrl?.errors || !ctrl.touched) return '';
        if (ctrl.errors['required']) return 'Campo obligatorio';
        if (ctrl.errors['email']) return 'Email inválido';
        if (ctrl.errors['maxlength']) return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres`;
        if (ctrl.errors['min']) return 'El valor no puede ser negativo';
        return 'Campo inválido';
    }
}
