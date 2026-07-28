import {
    Component, ChangeDetectionStrategy, inject, signal, input, output, effect
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import {
    AdminFormLayoutComponent,
    AdminFormSectionComponent,
} from '@shared/ui';
import { CustomerService } from '@features/admin/services/customer.service';
import { AuthService } from '@core/auth/auth.service';
import {
    CustomerResponse,
    CustomerRequest,
} from '@features/admin/models/customer.model';
import { bloquearEnEdicion, bloquearSiempre } from '@shared/utils/form-lock';

@Component({
    selector: 'app-customer-form',
    standalone: true,
    imports: [
        ReactiveFormsModule, DrawerComponent, ButtonComponent, AdminFormLayoutComponent,
        AdminFormSectionComponent, CatalogSelectComponent,
    ],
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
        // Calculado por el backend (deuda vigente del cliente): se muestra, nunca se envía.
        saldoCredito: [0],
        notas: [''],
        // Baja lógica reversible: permite reactivar un cliente dado de baja desde el propio drawer.
        activo: [true],
    });

    isJuridica = signal(false);

    /**
     * Identidad tributaria del cliente: cambiarla tras el primer guardado desalinea los
     * comprobantes ya emitidos a ese documento. Se muestra bloqueada, no oculta.
     */
    private static readonly CAMPOS_BLOQUEADOS = ['tipoDocumento', 'numeroDocumento'] as const;

    /** Campos calculados por el backend: nunca editables (ni al crear ni al editar). */
    private static readonly CAMPOS_CALCULADOS = ['saldoCredito'] as const;

    constructor() {
        // El saldo de crédito lo calcula el backend en TODO momento (alta y edición).
        bloquearSiempre(this.form, CustomerFormComponent.CAMPOS_CALCULADOS);
        // app-catalog-select no expone (change) nativo del <select>; el control
        // reactivo sigue notificando via valueChanges (reemplaza el (change) previo).
        this.form.get('tipoCliente')!.valueChanges.subscribe((value: string) => {
            this.onTipoClienteChange(value);
        });

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
                    saldoCredito: c.saldoCredito,
                    notas: c.notas,
                    activo: c.activo,
                });
                this.isJuridica.set(c.tipoCliente === 'PERSONA_JURIDICA');
                bloquearEnEdicion(this.form, CustomerFormComponent.CAMPOS_BLOQUEADOS, true);
            } else {
                this.form.reset({
                    tipoCliente: 'PERSONA_NATURAL',
                    tipoDocumento: 'DNI',
                    condicionPago: 'CONTADO',
                    limiteCredito: 0,
                    saldoCredito: 0,
                    activo: true,
                });
                this.isJuridica.set(false);
                bloquearEnEdicion(this.form, CustomerFormComponent.CAMPOS_BLOQUEADOS, false);
            }
            // bloquearEnEdicion(...,false) rehabilita todo lo listado: el saldo calculado
            // se vuelve a bloquear siempre, sea alta o edición.
            bloquearSiempre(this.form, CustomerFormComponent.CAMPOS_CALCULADOS);
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

        // getRawValue(): tipoDocumento/numeroDocumento quedan deshabilitados en edición y
        // no saldrían en form.value (se enviarían nulls). `saldoCredito` se omite a
        // propósito del DTO: lo calcula el backend.
        const v = this.form.getRawValue();
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
            // Estado explícito: el backend solo respeta el actual si llega null/ausente.
            activo: v.activo !== false,
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

    err(field: string): string {
        const c = this.form.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('email')) return 'Email inválido';
        if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres`;
        if (c.hasError('maxlength')) return `Máximo ${c.getError('maxlength').requiredLength} caracteres`;
        if (c.hasError('pattern')) return 'Formato inválido';
        if (c.hasError('min')) return 'El valor no puede ser negativo';
        return 'Campo inválido';
    }
}
