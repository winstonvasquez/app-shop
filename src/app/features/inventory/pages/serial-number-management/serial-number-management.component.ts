import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { SerialNumberWms, SerialStatusWms } from '../../models/wms-zone.models';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-serial-number-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent,
        ButtonComponent, CatalogSelectComponent, ProductLookupComponent
    ],
    templateUrl: './serial-number-management.component.html',
    styleUrl: './serial-number-management.component.scss'
})
export class SerialNumberManagementComponent {
    private readonly api = inject(WmsApiService);
    private readonly fb = inject(FormBuilder);

    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    seriales = signal<SerialNumberWms[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    info = signal<string | null>(null);

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showStatusDrawer = signal(false);
    statusTarget = signal<SerialNumberWms | null>(null);
    statusSubmitting = signal(false);
    statusError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Números de Serie' }
    ];

    columns: TableColumn<SerialNumberWms>[] = [
        { key: 'serialNumber', label: 'N° Serie', sortable: true },
        { key: 'sku', label: 'SKU' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<SerialStatusWms, string> = {
                    AVAILABLE: 'badge-success', RESERVED: 'badge-warning',
                    SOLD: 'badge-neutral', RETURNED: 'badge-accent', DEFECTIVE: 'badge-error'
                };
                return `<span class="badge ${cls[r.status]}">${r.status}</span>`;
            }
        },
        { key: 'currentLocation', label: 'Ubicación', render: (r) => r.currentLocation ?? '—' },
        { key: 'notas', label: 'Notas', render: (r) => r.notas ?? '—' }
    ];

    actions: TableAction<SerialNumberWms>[] = [
        { label: 'Cambiar estado', class: 'btn btn-secondary', onClick: (r) => this.openStatusChange(r) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sku: ['', Validators.required],
        serialNumber: ['', Validators.required],
        currentLocation: [''],
        notas: ['']
    });

    statusForm: FormGroup = this.fb.nonNullable.group({
        status: ['', Validators.required]
    });

    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.loadSeriales();
    }

    loadSeriales(): void {
        const productId = this.currentProductId();
        if (productId === null) return;
        this.loading.set(true);
        this.api.listarSeriales(productIdToUuid(productId)).subscribe({
            next: (data) => { this.seriales.set(data); this.loading.set(false); },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.form.reset();
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        const productId = this.currentProductId();
        if (productId === null || this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        this.api.registrarSerial({ ...v, productoId: productIdToUuid(productId) }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                this.info.set('Número de serie registrado.');
                this.loadSeriales();
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    openStatusChange(serial: SerialNumberWms): void {
        this.statusTarget.set(serial);
        this.statusForm.reset({ status: serial.status });
        this.statusError.set(null);
        this.showStatusDrawer.set(true);
    }

    closeStatusDrawer(): void { this.showStatusDrawer.set(false); this.statusTarget.set(null); }

    submitStatusChange(): void {
        const target = this.statusTarget();
        if (!target || this.statusForm.invalid) return;
        this.statusSubmitting.set(true);
        const status = this.statusForm.getRawValue().status as SerialStatusWms;
        this.api.cambiarStatusSerial(target.id, status).subscribe({
            next: () => {
                this.statusSubmitting.set(false);
                this.closeStatusDrawer();
                this.info.set(`Serial ${target.serialNumber} cambiado a ${status}.`);
                this.loadSeriales();
            },
            error: (err: Error) => { this.statusSubmitting.set(false); this.statusError.set(err.message); }
        });
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
