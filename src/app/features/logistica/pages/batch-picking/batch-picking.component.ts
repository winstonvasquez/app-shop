import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { PickingBatchService } from '../../services/picking-batch.service';
import { PickingBatch } from '../../models/picking.model';

@Component({
    selector: 'app-batch-picking',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './batch-picking.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchPickingComponent implements OnInit {
    private readonly batchService = inject(PickingBatchService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    batches    = signal<PickingBatch[]>([]);
    loading    = signal(false);
    generating = signal(false);
    actionId   = signal<string | null>(null);
    error      = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    batchForm = this.fb.group({
        orderIdsInput: ['', [Validators.required]],
        strategy:      ['ZONE', [Validators.required]]
    });

    ngOnInit(): void {
        this.loadBatches();
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
        const orderIds = (orderIdsInput ?? '')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

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
                setTimeout(() => this.successMsg.set(null), 3000);
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
            case 'IN_PROGRESS': return 'bg-warning/10 text-warning';
            case 'COMPLETED':   return 'bg-success/10 text-success';
            case 'CANCELLED':   return 'bg-error/10 text-error';
            default:            return 'bg-surface-raised text-subtle';
        }
    }

    formatDate(d: string): string {
        if (!d) return '-';
        return new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    }
}
