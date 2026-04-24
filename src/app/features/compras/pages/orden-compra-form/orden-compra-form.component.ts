import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ProveedorService } from '../../services/proveedor.service';
import { OrdenCompra, OrdenCompraItem } from '../../models/orden-compra.model';
import { Proveedor } from '../../models/proveedor.model';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '@shared/components';

export interface OcItemForm {
    productoNombre: string;
    sku: string;
    cantidad: number;
    precioUnitario: number;
}

@Component({
    selector: 'app-orden-compra-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    DecimalPipe,
    ButtonComponent
  ],
    templateUrl: './orden-compra-form.component.html'
})
export class OrdenCompraFormComponent implements OnInit {
    private readonly ordenService = inject(OrdenCompraService);
    private readonly proveedorService = inject(ProveedorService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    editMode = signal(false);
    loading = signal(false);
    submitting = signal(false);
    error = signal<string | null>(null);
    submitError = signal<string | null>(null);
    proveedores = signal<Proveedor[]>([]);
    formItems = signal<OcItemForm[]>([{ productoNombre: '', sku: '', cantidad: 1, precioUnitario: 0 }]);

    totales = computed(() => {
        const items = this.formItems();
        const subtotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
        const igv = subtotal * 0.18;
        return { subtotal, igv, total: subtotal + igv };
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Órdenes de Compra', url: '/admin/compras/ordenes' },
        { label: 'Nueva Orden' }
    ];

    readonly condicionPagoOptions = [
        { value: 'CONTADO', label: 'Contado' },
        { value: 'CREDITO_15', label: 'Crédito 15 días' },
        { value: 'CREDITO_30', label: 'Crédito 30 días' },
        { value: 'CREDITO_60', label: 'Crédito 60 días' },
        { value: 'CREDITO_90', label: 'Crédito 90 días' }
    ];

    readonly almacenOptions = [
        { value: 'ALM1', label: 'Almacén Principal (ALM1)' },
        { value: 'ALM2', label: 'Almacén Secundario (ALM2)' }
    ];

    ocForm: FormGroup;

    constructor() {
        this.ocForm = this.fb.group({
            proveedorId: ['', Validators.required],
            fechaEmision: ['', Validators.required],
            fechaEntregaEstimada: [''],
            condicionPago: ['CONTADO', Validators.required],
            almacenDestino: ['ALM1', Validators.required],
            observaciones: ['']
        });
    }

    ngOnInit(): void {
        this.loadProveedores();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editMode.set(true);
            this.breadcrumbs = [
                { label: 'Admin', url: '/admin' },
                { label: 'Compras', url: '/admin/compras/dashboard' },
                { label: 'Órdenes de Compra', url: '/admin/compras/ordenes' },
                { label: 'Editar Orden' }
            ];
            this.loadOrden(id);
        }
    }

    private loadProveedores(): void {
        this.proveedorService.getProveedores(0, 200).subscribe({
            next: (res) => this.proveedores.set(res.content),
            error: () => { /* silent */ }
        });
    }

    private loadOrden(id: string): void {
        this.loading.set(true);
        this.ordenService.getOrdenById(id).subscribe({
            next: (orden) => {
                this.ocForm.patchValue({
                    proveedorId: orden.proveedorId,
                    fechaEmision: orden.fechaEmision,
                    fechaEntregaEstimada: orden.fechaEntregaEstimada ?? '',
                    condicionPago: orden.condicionPago,
                    almacenDestino: orden.almacenDestino,
                    observaciones: orden.observaciones ?? ''
                });
                this.formItems.set((orden.items ?? []).map(i => ({
                    productoNombre: i.productoNombre,
                    sku: i.sku ?? '',
                    cantidad: i.cantidad,
                    precioUnitario: i.precioUnitario
                })));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    addItem(): void {
        this.formItems.update(items => [...items, { productoNombre: '', sku: '', cantidad: 1, precioUnitario: 0 }]);
    }

    removeItem(index: number): void {
        this.formItems.update(items => items.filter((_, i) => i !== index));
    }

    updateItem(index: number, field: keyof OcItemForm, value: string | number): void {
        this.formItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }

    onSubmit(): void {
        if (this.ocForm.invalid) {
            this.ocForm.markAllAsTouched();
            return;
        }
        if (this.formItems().length === 0) {
            this.submitError.set('Debe agregar al menos un producto.');
            return;
        }
        const invalid = this.formItems().some(i => !i.productoNombre.trim() || i.cantidad < 1 || i.precioUnitario <= 0);
        if (invalid) {
            this.submitError.set('Verifique que todos los productos tengan nombre, cantidad y precio.');
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const { subtotal, igv, total } = this.totales();
        const payload: Partial<OrdenCompra> = {
            ...this.ocForm.value,
            subtotal,
            igv,
            total,
            items: this.formItems().map(i => ({
                productoNombre: i.productoNombre,
                sku: i.sku || undefined,
                cantidad: i.cantidad,
                precioUnitario: i.precioUnitario,
                subtotal: i.cantidad * i.precioUnitario
            } as OrdenCompraItem))
        };

        const id = this.route.snapshot.paramMap.get('id');
        const op = id
            ? this.ordenService.updateOrden(id, payload)
            : this.ordenService.createOrden(payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.router.navigate(['/admin/compras/ordenes']);
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onCancel(): void {
        this.router.navigate(['/admin/compras/ordenes']);
    }

    getControl(name: string): FormControl {
        return this.ocForm.get(name) as FormControl;
    }
}
