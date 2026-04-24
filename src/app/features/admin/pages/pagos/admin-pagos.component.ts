import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

// ─────────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentAttempt {
    id: number;
    pedidoId: number;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    externalId: string | null;
    gatewayResponse: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Página de administración: historial de intentos de pago.
 * Ruta: /admin/pagos
 */
@Component({
    selector: 'app-admin-pagos',
    standalone: true,
    imports: [DatePipe, DecimalPipe],
    template: `
<div class="page-container">
    <div class="page-header">
        <div>
            <h1 class="page-title">Historial de Pagos</h1>
            <p class="page-subtitle">Intentos de pago procesados por MercadoPago</p>
        </div>
    </div>

    @if (isLoading()) {
    <div class="loading-container">
        <div class="spinner"></div>
        <span class="text-sm text-[var(--color-text-muted)] mt-2">Cargando intentos de pago...</span>
    </div>
    } @else if (errorMessage()) {
    <div class="p-4 bg-[color-mix(in_oklch,var(--color-error)_10%,var(--color-surface))] border border-[var(--color-error)] rounded-xl text-sm text-[var(--color-error)]">
        {{ errorMessage() }}
    </div>
    } @else {

    <!-- Filtros / resumen -->
    <div class="filters-bar mb-4">
        <div class="flex gap-4 text-sm">
            <span class="badge badge-success">Aprobados: {{ countByStatus('APPROVED') }}</span>
            <span class="badge badge-error">Rechazados: {{ countByStatus('REJECTED') }}</span>
            <span class="badge badge-warning">Pendientes: {{ countByStatus('PENDING') }}</span>
        </div>
    </div>

    <!-- Tabla -->
    <div class="card">
        <div class="card-body p-0">
            <div class="overflow-x-auto">
                <table class="table w-full">
                    <thead class="table-header">
                        <tr>
                            <th class="table-header-cell">Fecha</th>
                            <th class="table-header-cell">Pedido #</th>
                            <th class="table-header-cell">Método</th>
                            <th class="table-header-cell">Estado</th>
                            <th class="table-header-cell text-right">Monto</th>
                            <th class="table-header-cell">ID Externo</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (attempt of pagos(); track attempt.id) {
                        <tr class="table-row">
                            <td class="table-cell text-sm">
                                {{ attempt.createdAt | date:'dd/MM/yyyy HH:mm' }}
                            </td>
                            <td class="table-cell font-medium">
                                #{{ attempt.pedidoId }}
                            </td>
                            <td class="table-cell">
                                <span class="text-sm">{{ formatMethod(attempt.paymentMethod) }}</span>
                            </td>
                            <td class="table-cell">
                                <span [class]="getBadgeClass(attempt.status)">
                                    {{ formatStatus(attempt.status) }}
                                </span>
                            </td>
                            <td class="table-cell text-right font-bold">
                                S/ {{ attempt.amount | number:'1.2-2' }}
                            </td>
                            <td class="table-cell text-xs text-[var(--color-text-muted)]">
                                {{ attempt.externalId ?? '—' }}
                            </td>
                        </tr>
                        } @empty {
                        <tr>
                            <td colspan="6" class="table-cell text-center text-[var(--color-text-muted)] py-10">
                                No hay intentos de pago registrados.
                            </td>
                        </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    }
</div>
    `
})
export class AdminPagosComponent implements OnInit {

    private readonly http = inject(HttpClient);
    private readonly apiBase = `${environment.apiUrls.sales}/api/pagos`;

    pagos = signal<PaymentAttempt[]>([]);
    isLoading = signal(true);
    errorMessage = signal('');

    ngOnInit(): void {
        this.loadHistorial();
    }

    loadHistorial(): void {
        this.isLoading.set(true);
        this.errorMessage.set('');

        this.http.get<PaymentAttempt[]>(`${this.apiBase}/historial`).subscribe({
            next: (data) => {
                this.pagos.set(data);
                this.isLoading.set(false);
            },
            error: (err: Error) => {
                this.errorMessage.set('Error al cargar el historial de pagos: ' + err.message);
                this.isLoading.set(false);
            }
        });
    }

    countByStatus(status: string): number {
        return this.pagos().filter(p => p.status === status).length;
    }

    getBadgeClass(status: string): string {
        switch (status) {
            case 'APPROVED': return 'badge badge-success';
            case 'REJECTED': return 'badge badge-error';
            case 'PENDING':  return 'badge badge-warning';
            default:         return 'badge badge-neutral';
        }
    }

    formatStatus(status: string): string {
        const map: Record<string, string> = {
            APPROVED:  'Aprobado',
            REJECTED:  'Rechazado',
            PENDING:   'Pendiente',
            CANCELLED: 'Cancelado'
        };
        return map[status] ?? status;
    }

    formatMethod(method: string): string {
        const map: Record<string, string> = {
            TARJETA:         'Tarjeta',
            TARJETA_CREDITO: 'Tarjeta Crédito',
            YAPE:            'Yape',
            PLIN:            'Plin',
            TRANSFERENCIA:   'Transferencia'
        };
        return map[method] ?? method;
    }
}
