import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { PickingBatchService } from '../../services/picking-batch.service';
import { PickingBatch } from '../../models/picking.model';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { ROUTES } from '@shared/constants/app.constants';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';

@Component({
    selector: 'app-batch-picking',
    standalone: true,
    imports: [
        ReactiveFormsModule, ButtonComponent, CatalogSelectComponent,
        AlertComponent, FormFieldComponent, PageHeaderComponent, DataTableComponent
    ],
    templateUrl: './batch-picking.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchPickingComponent implements OnInit {
    private readonly batchService = inject(PickingBatchService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Logística', url: '/admin/logistica/dashboard' },
        { label: 'Batch Picking' }
    ];

    batches    = signal<PickingBatch[]>([]);
    loading    = signal(false);
    generating = signal(false);
    actionId   = signal<string | null>(null);
    error      = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    batchForm: FormGroup = this.fb.group({
        orderIdsInput: ['', [Validators.required]],
        strategy:      ['ZONE', [Validators.required]]
    });

    batchColumns: TableColumn<PickingBatch>[] = [
        { key: 'id', label: 'ID', render: (r) => r.id.slice(0, 8) + '...' },
        { key: 'status', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.statusClass(r.status)}">${r.status}</span>` },
        { key: 'orderIds', label: 'Órdenes', align: 'right', render: (r) => String(r.orderIds.length) },
        { key: 'items', label: 'Items', align: 'right', render: (r) => String(r.items.length) },
        { key: 'createdAt', label: 'Creado', render: (r) => this.formatDate(r.createdAt) }
    ];

    batchActions: TableAction<PickingBatch>[] = [
        { label: 'Iniciar', icon: 'play', class: 'btn-icon-edit',
          show: (r) => r.status === 'PENDING',
          onClick: (r) => this.startBatch(r.id) },
        { label: 'Completar', icon: 'check', class: 'btn-icon-edit',
          show: (r) => r.status === 'IN_PROGRESS',
          onClick: (r) => this.completeBatch(r.id) }
    ];

    ngOnInit(): void {
        this.loadBatches();
    }

    getCtrl(name: string): FormControl {
        return this.batchForm.get(name) as FormControl;
    }

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? '');
    }

    loadBatches(): void {
        this.loading.set(true);
        this.batchService.list().subscribe({
            next: (page) => {
                this.batches.set(page.content);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar batches');
                this.loading.set(false);
            }
        });
    }

    generateBatch(): void {
        const { orderIdsInput, strategy } = this.batchForm.value;
        const orderIds = String(orderIdsInput ?? '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

        if (orderIds.length === 0) {
            this.error.set('Ingresa al menos un ID de orden');
            return;
        }

        this.generating.set(true);
        this.error.set(null);
        this.batchService.generate({ orderIds, companyId: this.companyId }).subscribe({
            next: (batch) => {
                this.batches.update(list => [batch, ...list]);
                this.batchForm.get('orderIdsInput')?.setValue('');
                this.generating.set(false);
                this.successMsg.set('Batch generado exitosamente');
                setTimeout(() => this.successMsg.set(null), NOTIFICATION_DURATION.medium);
            },
            error: () => {
                this.error.set('Error al generar batch');
                this.generating.set(false);
            }
        });
    }

    startBatch(id: string): void {
        this.actionId.set(id);
        this.batchService.start(id).subscribe({
            next: (updated) => {
                this.batches.update(list => list.map(b => b.id === id ? updated : b));
                this.actionId.set(null);
            },
            error: () => this.actionId.set(null)
        });
    }

    completeBatch(id: string): void {
        this.actionId.set(id);
        this.batchService.complete(id).subscribe({
            next: (updated) => {
                this.batches.update(list => list.map(b => b.id === id ? updated : b));
                this.actionId.set(null);
            },
            error: () => this.actionId.set(null)
        });
    }

    statusClass(status: string): string {
        switch (status) {
            case 'IN_PROGRESS': return 'badge-warning';
            case 'COMPLETED':   return 'badge-success';
            case 'CANCELLED':   return 'badge-error';
            default:            return 'badge-neutral';
        }
    }

    formatDate(d: string): string {
        if (!d) return '-';
        return new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    }
}
