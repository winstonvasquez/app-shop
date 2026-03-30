import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { KardexEntry } from '../../models/inventory.models';

@Component({
    selector: 'app-kardex-view',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Kardex</h1>
                <p class="text-sm text-subtle">Consulta el historial de movimientos por producto.</p>
            </header>

            <form class="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5 shadow-sm md:flex-row" [formGroup]="kardexForm" (ngSubmit)="onSearch()">
                <div class="flex-1">
                    <label class="text-xs font-semibold uppercase text-subtle">Producto ID</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="productId" placeholder="123">
                </div>
                <div class="flex items-end gap-2">
                    <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="kardexForm.invalid || loading()">
                        {{ loading() ? 'Buscando...' : 'Consultar' }}
                    </button>
                    <button type="button" class="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface" (click)="exportarCsv()" [disabled]="entries().length === 0">
                        Exportar CSV
                    </button>
                </div>
            </form>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Movimientos</h2>
                    <span class="text-xs text-subtle">{{ entries().length }} registros</span>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Fecha</th>
                                <th class="py-2">Tipo</th>
                                <th class="py-2">Cantidad</th>
                                <th class="py-2">Saldo</th>
                                <th class="py-2">Referencia</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (entry of entries(); track entry.movementId) {
                                <tr>
                                    <td class="py-3 text-subtle">{{ entry.movementDate | date:'short' }}</td>
                                    <td class="py-3 text-on">{{ entry.movementType }}</td>
                                    <td class="py-3 text-on">{{ entry.quantity }}</td>
                                    <td class="py-3 text-on">{{ entry.balanceAfter }}</td>
                                    <td class="py-3 text-subtle">{{ entry.referenceNumber || '-' }}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `
})
export class KardexViewComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    entries = signal<KardexEntry[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    kardexForm = this.fb.nonNullable.group({
        productId: [0, [Validators.required, Validators.min(1)]]
    });

    onSearch(): void {
        if (this.kardexForm.invalid) {
            this.kardexForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        const productId = this.kardexForm.value.productId ?? 0;
        this.api.getKardexByProduct(productId).subscribe({
            next: (response) => {
                this.entries.set(response);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    exportarCsv(): void {
        if (this.entries().length === 0) return;
        const bom = '\uFEFF';
        const headers = ['Fecha', 'Tipo Movimiento', 'N° Movimiento', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Saldo Posterior', 'Tipo Referencia', 'N° Referencia', 'Razón', 'Realizado por'];
        const filas = [headers, ...this.entries().map(e => [
            e.movementDate ?? '',
            e.movementType ?? '',
            e.movementNumber ?? '',
            String(e.quantity ?? ''),
            String(e.unitCost ?? ''),
            String(e.totalCost ?? ''),
            String(e.balanceAfter ?? ''),
            e.referenceType ?? '',
            e.referenceNumber ?? '',
            e.reason ?? '',
            e.performedBy ?? ''
        ])];
        const csv = bom + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kardex-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
