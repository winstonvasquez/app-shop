import {
    ChangeDetectionStrategy, Component, inject, signal, OnInit
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { ButtonComponent } from '@shared/components';
import { InventoryApiService } from '../../services/inventory-api.service';
import { Warehouse } from '../../models/inventory.models';

@Component({
    selector: 'app-warehouse-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent, ModalComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent,
        ButtonComponent
    ],
    templateUrl: './warehouse-management.component.html',
    styleUrl: './warehouse-management.component.scss'
})
export class WarehouseManagementComponent implements OnInit {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showConfirmDelete = signal(false);
    pendingDeleteId = signal<number | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Almacenes' }
    ];

    columns: TableColumn<Warehouse>[] = [
        { key: 'code',              label: 'Código',      sortable: true, width: '110px' },
        { key: 'name',              label: 'Nombre',      sortable: true },
        { key: 'city',              label: 'Ciudad',      render: (r) => r.city ?? '—' },
        { key: 'responsiblePerson', label: 'Responsable', render: (r) => r.responsiblePerson ?? '—' },
        {
            key: 'isPrincipal', label: 'Principal',
            render: (r) => r.isPrincipal
                ? '<span class="badge badge-accent">Principal</span>'
                : '<span class="badge badge-neutral">—</span>',
            html: true
        },
        {
            key: 'active', label: 'Estado',
            render: (r) => r.active
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-error">Inactivo</span>',
            html: true
        }
    ];

    actions: TableAction<Warehouse>[] = [
        {
            label: 'Editar',
            icon: 'edit',
            class: 'btn-icon-edit',
            onClick: (row) => this.openEdit(row)
        },
        {
            label: 'Eliminar',
            icon: 'trash',
            class: 'btn-icon-delete',
            onClick: (row) => this.confirmDelete(row.id)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        code:              ['', [Validators.required, Validators.maxLength(20)]],
        name:              ['', [Validators.required, Validators.maxLength(200)]],
        description:       [''],
        address:           [''],
        city:              [''],
        country:           ['', Validators.maxLength(100)],
        phone:             [''],
        responsiblePerson: [''],
        active:            [true],
        isPrincipal:       [false]
    });

    ngOnInit(): void {
        this.loadWarehouses();
    }

    loadWarehouses(): void {
        this.loading.set(true);
        this.api.getWarehouses().subscribe({
            next: (data) => {
                this.warehouses.set(data);
                this.totalElements.set(data.length);
                this.totalPages.set(Math.ceil(data.length / this.pageSize()));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.form.reset({ active: true, isPrincipal: false });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(w: Warehouse): void {
        this.editMode.set(true);
        this.selectedId.set(w.id);
        this.form.patchValue(w);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.form.reset({ active: true, isPrincipal: false });
    }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const payload = this.form.getRawValue();
        const op = this.editMode()
            ? this.api.updateWarehouse(this.selectedId()!, payload)
            : this.api.createWarehouse(payload);
        op.subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadWarehouses(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    confirmDelete(id: number): void {
        this.pendingDeleteId.set(id);
        this.showConfirmDelete.set(true);
    }

    cancelDelete(): void {
        this.pendingDeleteId.set(null);
        this.showConfirmDelete.set(false);
    }

    executeDelete(): void {
        const id = this.pendingDeleteId();
        if (id === null) return;
        this.showConfirmDelete.set(false);
        this.api.deleteWarehouse(id).subscribe({
            next: () => { this.pendingDeleteId.set(null); this.loadWarehouses(); },
            error: (err: Error) => { this.pendingDeleteId.set(null); this.error.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.totalPages.set(Math.ceil(this.totalElements() / e.size));
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }
}
