import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor } from '../../models/proveedor.model';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-proveedor-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        LoadingSpinnerComponent,
        ButtonComponent
    ],
    templateUrl: './proveedor-form.component.html'
})
export class ProveedorFormComponent implements OnInit {
    private readonly proveedorService = inject(ProveedorService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    editMode = signal(false);
    loading = signal(false);
    submitting = signal(false);
    error = signal<string | null>(null);
    submitError = signal<string | null>(null);

    proveedorForm: FormGroup;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Proveedores', url: '/admin/compras/proveedores' },
        { label: 'Nuevo Proveedor' }
    ];

    constructor() {
        this.proveedorForm = this.fb.group({
            ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
            nombreComercial: ['', [Validators.maxLength(200)]],
            condicionSunat: ['HABIDO'],
            domicilioFiscal: [''],
            contactoNombre: [''],
            contactoTelefono: [''],
            contactoEmail: ['', [Validators.email]],
            banco: [''],
            cuentaBanco: [''],
            condicionPago: ['CONTADO'],
            monedaPreferida: ['PEN']
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editMode.set(true);
            this.breadcrumbs = [
                { label: 'Admin', url: '/admin' },
                { label: 'Compras', url: '/admin/compras/dashboard' },
                { label: 'Proveedores', url: '/admin/compras/proveedores' },
                { label: 'Editar Proveedor' }
            ];
            this.loadProveedor(id);
        }
    }

    private loadProveedor(id: string): void {
        this.loading.set(true);
        this.proveedorService.getProveedorById(id).subscribe({
            next: (p) => {
                this.proveedorForm.patchValue({
                    ruc: p.ruc,
                    razonSocial: p.razonSocial,
                    nombreComercial: p.nombreComercial ?? '',
                    condicionSunat: p.condicionSunat ?? 'HABIDO',
                    domicilioFiscal: p.domicilioFiscal ?? '',
                    contactoNombre: p.contactoNombre ?? '',
                    contactoTelefono: p.contactoTelefono ?? '',
                    contactoEmail: p.contactoEmail ?? '',
                    banco: p.banco ?? '',
                    cuentaBanco: p.cuentaBanco ?? '',
                    condicionPago: p.condicionPago ?? 'CONTADO',
                    monedaPreferida: p.monedaPreferida ?? 'PEN'
                });
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        if (this.proveedorForm.invalid) {
            this.proveedorForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);

        const id = this.route.snapshot.paramMap.get('id');
        const val = this.proveedorForm.value as Partial<Proveedor>;
        const op = id
            ? this.proveedorService.updateProveedor(id, val)
            : this.proveedorService.createProveedor(val);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.router.navigate(['/admin/compras/proveedores']);
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/admin/compras/proveedores']);
    }

    getControl(name: string): FormControl {
        return this.proveedorForm.get(name) as FormControl;
    }
}
