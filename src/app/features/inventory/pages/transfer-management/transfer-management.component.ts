import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormArray, FormControl
} from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryTransfer, InventoryTransferRequest, InventoryTransferStatus, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';

@Component({
    selector: 'app-transfer-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, ReactiveFormsModule,
        DataTableComponent, DrawerComponent,
        PageHeaderComponent, AlertComponent,
        FormFieldComponent, DateInputComponent
    ],
    templateUrl: './transfer-management.component.html',
    styleUrl: './transfer-management.component.scss'
})
export class TransferManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    transfers = signal<InventoryTransfer[]>([]);
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
        { label: 'Transferencias' }
    ];

    readonly statusLabels: Record<InventoryTransferStatus, string> = {
        PENDIENTE: 'Pendiente',
        ENVIADA:   'Enviada',
        RECIBIDA:  'Recibida',
        CANCELADA: 'Cancelada'
    };

    columns: TableColumn<InventoryTransfer>[] = [
        { key: 'transferNumber', label: 'N°', width: '130px',
          render: (r) => r.transferNumber ?? String(r.id) },
        { key: 'requestDate', label: 'Fecha', sortable: true,
          render: (r) => r.requestDate ? new Date(r.requestDate).toLocaleDateString('es-PE') : '—' },
        { key: 'sourceWarehouseName', label: 'Origen',
          render: (r) => r.sourceWarehouseName ?? String(r.sourceWarehouseId) },
        { key: 'destinationWarehouseName', label: 'Destino',
          render: (r) => r.destinationWarehouseName ?? String(r.destinationWarehouseId) },
        {
            key: 'status', label: 'Estado', html: true,
            render: (r) => {
                const cls: Record<InventoryTransferStatus, string> = {
                    PENDIENTE: 'badge-warning',
                    ENVIADA:   'badge-accent',
                    RECIBIDA:  'badge-success',
                    CANCELADA: 'badge-error'
                };
                return `<span class="badge ${cls[r.status] ?? 'badge-neutral'}">${this.statusLabels[r.status] ?? r.status}</span>`;
            }
        }
    ];

    actions: TableAction<InventoryTransfer>[] = [
        {
            label: 'Enviar',
            class: 'btn btn-secondary',
            show: (r) => r.status === 'PENDIENTE',
            onClick: (r) => this.onSend(r.id)
        },
        {
            label: 'Recibir',
            class: 'btn btn-primary',
            show: (r) => r.status === 'ENVIADA',
            onClick: (r) => this.onReceive(r.id)
        }
    ];

    form: FormGroup = this.fb.nonNullable.group({
        sourceWarehouseId:      [null as number | null, Validators.required],
        destinationWarehouseId: [null as number | null, Validators.required],
        requestDate:            ['', Validators.required],
        notes:                  [''],
        details:                this.fb.array([this.newDetailRow()])
    });

    get details(): FormArray { return this.form.get('details') as FormArray; }

    newDetailRow(): FormGroup {
        return this.fb.nonNullable.group({
            productId:         [null as number | null, Validators.required],
            requestedQuantity: [null as number | null, [Validators.required, Validators.min(1)]],
            notes:             ['']
        });
    }

    constructor() {
        this.loadWarehouses();
        this.loadTransfers();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({ next: (d) => this.warehouses.set(d) });
    }

    loadTransfers(): void {
        this.loading.set(true);
        this.api.getTransfers({
            page: this.currentPage(),
            size: this.pageSize(),
            status: this.filterStatus() || undefined
        }).subscribe({
            next: (res) => {
                this.transfers.set(res.content);
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
        this.loadTransfers();
    }

    openCreate(): void {
        while (this.details.length > 1) this.details.removeAt(this.details.length - 1);
        this.details.at(0).reset();
        this.form.reset({ requestDate: new Date().toISOString().split('T')[0] });
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
        const payload: InventoryTransferRequest = {
            sourceWarehouseId:      Number(v.sourceWarehouseId),
            destinationWarehouseId: Number(v.destinationWarehouseId),
            requestDate:            v.requestDate,
            notes:                  v.notes || undefined,
            details:                v.details.map((d: { productId: number; requestedQuantity: number; notes: string }) => ({
                productId:         Number(d.productId),
                requestedQuantity: Number(d.requestedQuantity),
                notes:             d.notes || undefined
            }))
        };
        this.api.createTransfer(payload).subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadTransfers(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    onSend(id: number): void {
        if (!confirm('¿Marcar como ENVIADA esta transferencia?')) return;
        this.api.sendTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onReceive(id: number): void {
        if (!confirm('¿Confirmar recepción de esta transferencia?')) return;
        this.api.receiveTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadTransfers();
    }

    getDetailCtrl(i: number, name: string): FormControl {
        return this.details.at(i).get(name) as FormControl;
    }

    getCtrl(name: string): FormControl { return this.form.get(name) as FormControl; }
}
