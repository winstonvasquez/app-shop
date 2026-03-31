import {
    ChangeDetectionStrategy, Component, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { Location, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';

@Component({
    selector: 'app-location-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent
    ],
    templateUrl: './location-management.component.html',
    styleUrl: './location-management.component.scss'
})
export class LocationManagementComponent implements OnInit {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    locations = signal<Location[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    selectedWarehouseId = signal<number | null>(null);

    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Ubicaciones' }
    ];

    columns: TableColumn<Location>[] = [
        { key: 'code',  label: 'Código',   sortable: true, width: '110px' },
        { key: 'name',  label: 'Nombre',   sortable: true, render: (r) => r.name ?? '—' },
        { key: 'aisle', label: 'Pasillo',  render: (r) => r.aisle ?? '—' },
        { key: 'rack',  label: 'Estante',  render: (r) => r.rack  ?? '—' },
        { key: 'shelf', label: 'Nivel',    render: (r) => r.shelf ?? '—' },
        { key: 'bin',   label: 'Posición', render: (r) => r.bin   ?? '—' },
        {
            key: 'active', label: 'Estado', html: true,
            render: (r) => r.active
                ? '<span class="badge badge-success">Activo</span>'
                : '<span class="badge badge-error">Inactivo</span>'
        }
    ];

    actions: TableAction<Location>[] = [
        { label: 'Editar',   icon: 'edit',  class: 'btn-icon-edit',   onClick: (r) => this.openEdit(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.onDelete(r.id) }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        warehouseId:  [null as number | null, Validators.required],
        code:         ['', [Validators.required, Validators.maxLength(20)]],
        name:         ['', Validators.maxLength(200)],
        description:  [''],
        aisle:        [''],
        rack:         [''],
        shelf:        [''],
        bin:          [''],
        locationType: [''],
        capacity:     [null as number | null],
        active:       [true]
    });

    ngOnInit(): void {
        this.loadWarehouses();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (data) => this.warehouses.set(data),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onWarehouseChange(event: Event): void {
        const id = Number((event.target as HTMLSelectElement).value);
        this.selectedWarehouseId.set(id || null);
        if (id) this.loadLocations(id);
        else { this.locations.set([]); this.totalElements.set(0); this.totalPages.set(0); }
    }

    loadLocations(warehouseId: number): void {
        this.loading.set(true);
        this.api.getLocationsByWarehouse(warehouseId).subscribe({
            next: (data) => {
                this.locations.set(data);
                this.totalElements.set(data.length);
                this.totalPages.set(Math.ceil(data.length / this.pageSize()) || 1);
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.form.reset({ active: true, warehouseId: this.selectedWarehouseId() });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(loc: Location): void {
        this.editMode.set(true);
        this.selectedId.set(loc.id);
        this.form.patchValue({ ...loc });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload = { ...v, warehouseId: Number(v.warehouseId) };
        const op = this.editMode()
            ? this.api.updateLocation(this.selectedId()!, payload)
            : this.api.createLocation(payload);
        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                if (this.selectedWarehouseId()) this.loadLocations(this.selectedWarehouseId()!);
            },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onDelete(id: number): void {
        if (!confirm('¿Eliminar esta ubicación?')) return;
        this.api.deleteLocation(id).subscribe({
            next: () => { if (this.selectedWarehouseId()) this.loadLocations(this.selectedWarehouseId()!); },
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
