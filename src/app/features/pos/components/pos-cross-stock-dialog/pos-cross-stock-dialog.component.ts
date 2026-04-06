import {
    Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { environment } from '@env/environment';

interface StockSucursal {
    sucursalId: number;
    sucursalNombre: string;
    stock: number;
}

@Component({
    selector: 'app-pos-cross-stock-dialog',
    standalone: true,
    imports: [DecimalPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" (click)="close.emit()">
        <div class="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 w-full max-w-md shadow-xl"
             (click)="$event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-base font-bold text-on">Stock en otras tiendas</h3>
                <button class="text-muted hover:text-on" (click)="close.emit()">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>

            @if (loading()) {
                <div class="flex justify-center py-8">
                    <svg class="animate-spin text-[var(--color-primary)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                        <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
                    </svg>
                </div>
            } @else if (stockList().length === 0) {
                <p class="text-sm text-muted text-center py-6">No hay sucursales configuradas</p>
            } @else {
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-[var(--color-border)]">
                            <th class="py-2 text-left text-[10px] font-semibold text-muted uppercase">Sucursal</th>
                            <th class="py-2 text-right text-[10px] font-semibold text-muted uppercase">Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (item of stockList(); track item.sucursalId) {
                            <tr class="border-b border-[var(--color-border)]/50">
                                <td class="py-2.5 text-on">{{ item.sucursalNombre }}</td>
                                <td class="py-2.5 text-right font-mono font-bold"
                                    [class]="item.stock > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
                                    {{ item.stock }}
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            }
        </div>
    </div>
    `,
})
export class PosCrossStockDialogComponent implements OnInit {
    private readonly http = inject(HttpClient);

    readonly varianteId = input.required<number>();
    readonly companyId = input.required<number>();
    readonly close = output<void>();

    readonly stockList = signal<StockSucursal[]>([]);
    readonly loading = signal(true);

    ngOnInit(): void {
        this.http.get<StockSucursal[]>(
            `${environment.apiUrls.pos}/catalogo/${this.varianteId()}/stock-sucursales`,
            { params: { companyId: this.companyId().toString() } }
        ).subscribe({
            next: list => { this.stockList.set(list); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }
}
