import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { Lot, LotExpirationAlert } from '../../models/wms-zone.models';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent } from '@shared/components';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-lot-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent, DateInputComponent,
        ButtonComponent, ProductLookupComponent
    ],
    templateUrl: './lot-management.component.html',
    styleUrl: './lot-management.component.scss'
})
export class LotManagementComponent {
    private readonly api = inject(WmsApiService);
    private readonly fb = inject(FormBuilder);

    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    lots = signal<Lot[]>([]);
    alertas = signal<LotExpirationAlert[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<string | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Lotes' }
    ];

    columns: TableColumn<Lot>[] = [
        { key: 'loteNumero', label: 'N° Lote', sortable: true },
        { key: 'sku', label: 'SKU' },
        { key: 'fechaVencimiento', label: 'Vencimiento',
          render: (r) => r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString('es-PE') : '—' },
        { key: 'cantidadInicial', label: 'Cant. Inicial', align: 'right' },
        { key: 'cantidadActual', label: 'Cant. Actual', align: 'right' },
        { key: 'proveedorNombre', label: 'Proveedor', render: (r) => r.proveedorNombre ?? '—' },
        {
            key: 'activo', label: 'Estado', html: true,
            render: (r) => r.activo
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-neutral">Inactivo</span>'
        }
    ];

    actions: TableAction<Lot>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (r) => this.openEdit(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.eliminar(r.id) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sku: ['', Validators.required],
        loteNumero: ['', Validators.required],
        fechaFabricacion: [''],
        fechaVencimiento: [''],
        cantidadInicial: [0, [Validators.required, Validators.min(0)]],
        proveedorNombre: [''],
        notas: ['']
    });

    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.loadLots();
        this.loadAlertas();
    }

    loadLots(): void {
        const productId = this.currentProductId();
        if (productId === null) return;
        this.loading.set(true);
        this.api.getLotsByProducto(productIdToUuid(productId)).subscribe({
            next: (data) => { this.lots.set(data); this.loading.set(false); },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Alertas de vencimiento próximo (30 días) — informativo, no filtra por producto actual. */
    loadAlertas(): void {
        this.api.getLotsExpiringSoon(30).subscribe({ next: (a) => this.alertas.set(a) });
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.form.reset({ cantidadInicial: 0 });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(lot: Lot): void {
        this.editMode.set(true);
        this.selectedId.set(lot.id);
        this.form.patchValue({ ...lot });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        const productId = this.currentProductId();
        if (productId === null || this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload = { ...v, productoId: productIdToUuid(productId) };
        const op = this.editMode()
            ? this.api.updateLot(this.selectedId()!, payload)
            : this.api.createLot(payload);
        op.subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadLots(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    eliminar(id: string): void {
        this.api.deleteLot(id).subscribe({
            next: () => this.loadLots(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
