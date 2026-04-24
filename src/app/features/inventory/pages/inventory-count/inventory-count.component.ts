import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
    FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormArray, FormControl
} from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryCount, InventoryCountRequest, InventoryCountStatus, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-inventory-count',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent,
        ButtonComponent
    ],
    templateUrl: './inventory-count.component.html',
    styleUrl: './inventory-count.component.scss'
})
export class InventoryCountComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    counts = signal<InventoryCount[]>([]);
    warehouses = signal<Warehouse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    filterStatus = signal('');

    showDrawer = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Inventarios Físicos' }
    ];

    readonly statusLabels: Record<InventoryCountStatus, string> = {
        EN_PROCESO: 'En proceso',
        CERRADO:    'Cerrado',
        AJUSTADO:   'Ajustado'
    };

    columns: TableColumn<InventoryCount>[] = [
        { key: 'countNumber', label: 'N°', width: '130px',
          render: (r) => r.countNumber ?? String(r.id) },
        { key: 'warehouseName', label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
        { key: 'countDate', label: 'Fecha', sortable: true,
          render: (r) => r.countDate ? new Date(r.countDate).toLocaleDateString('es-PE') : '—' },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<InventoryCountStatus, string> = {
                    EN_PROCESO: 'badge-warning',
                    CERRADO:    'badge-neutral',
                    AJUSTADO:   'badge-success'
                };
                return `<span class="badge ${cls[r.status]}">${this.statusLabels[r.status]}</span>`;
            }
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        warehouseId: [null as number | null, Validators.required],
        countDate:   ['', Validators.required],
        notes:       [''],
        details:     this.fb.array([this.newDetailRow()])
    });

    get details(): FormArray { return this.form.get('details') as FormArray; }

    newDetailRow(): FormGroup {
        return this.fb.nonNullable.group({
            productId:       [null as number | null, Validators.required],
            countedQuantity: [null as number | null, [Validators.required, Validators.min(0)]],
            notes:           ['']
        });
    }

    constructor() {
        this.loadWarehouses();
        this.loadCounts();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({ next: (d) => this.warehouses.set(d) });
    }

    loadCounts(): void {
        this.loading.set(true);
        this.api.getInventoryCounts({
            page: this.currentPage(),
            size: this.pageSize(),
            status: this.filterStatus() || undefined
        }).subscribe({
            next: (res) => {
                this.counts.set(res.content);
                this.totalElements.set(res.page.totalElements);
                this.totalPages.set(res.page.totalPages);
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onFilterStatus(event: Event): void {
        this.filterStatus.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
        this.loadCounts();
    }

    openCreate(): void {
        while (this.details.length > 1) this.details.removeAt(this.details.length - 1);
        this.details.at(0).reset();
        this.form.reset({ countDate: new Date().toISOString().split('T')[0] });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }
    addDetail(): void { this.details.push(this.newDetailRow()); }
    removeDetail(i: number): void { if (this.details.length > 1) this.details.removeAt(i); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload: InventoryCountRequest = {
            warehouseId: Number(v.warehouseId),
            countDate:   v.countDate,
            notes:       v.notes || undefined,
            details:     v.details.map((d: { productId: number; countedQuantity: number; notes: string }) => ({
                productId:       Number(d.productId),
                countedQuantity: Number(d.countedQuantity),
                notes:           d.notes || undefined
            }))
        };
        this.api.createInventoryCount(payload).subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadCounts(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadCounts();
    }

    getDetailCtrl(i: number, name: string): FormControl {
        return this.details.at(i).get(name) as FormControl;
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
