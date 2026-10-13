import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { APP_CONFIG } from '@shared/constants/app.constants';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';

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
    createdAt: string;
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
        <div class="flex gap-4 text-sm items-center">
            <span class="badge badge-neutral">Total: {{ totalElements() }}</span>
            <!-- Contadores por estado: sólo de la página cargada (el endpoint pagina). -->
            <span class="badge badge-success">Aprobados (pág.): {{ countByStatus('APPROVED') }}</span>
            <span class="badge badge-error">Rechazados (pág.): {{ countByStatus('REJECTED') }}</span>
            <span class="badge badge-warning">Pendientes (pág.): {{ countByStatus('PENDING') }}</span>
            <span class="ml-auto flex gap-2 items-center">
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() === 0" (click)="irAPagina(page() - 1)">Anterior</button>
                <span>Página {{ page() + 1 }} de {{ totalPages() || 1 }}</span>
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="page() + 1 >= totalPages()" (click)="irAPagina(page() + 1)">Siguiente</button>
            </span>
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
                                {{ attempt.createdAt | date:'${APP_CONFIG.dateTimeFormat}' }}
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
                                ${CURRENCY_DISPLAY.SYMBOL_PEN} {{ attempt.amount | number:'1.2-2' }}
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
    private readonly auth = inject(AuthService);
    private readonly apiBase = `${environment.apiUrls.sales}/api/pagos`;

    pagos = signal<PaymentAttempt[]>([]);
    isLoading = signal(true);
    errorMessage = signal('');
    page = signal(0);
    totalElements = signal(0);
    totalPages = signal(0);
    private readonly size = 50;

    ngOnInit(): void {
        this.loadHistorial();
    }

    loadHistorial(): void {
        this.isLoading.set(true);
        this.errorMessage.set('');

        // El endpoint exige companyId (sin él: 400) y devuelve Page<PagoHistorialDto>.
        const params = toHttpParams({
            companyId: this.auth.currentUser()?.activeCompanyId,
            page: this.page(),
            size: this.size
        });
        this.http.get<unknown>(`${this.apiBase}/historial`, { params }).subscribe({
            next: (raw) => {
                const res = adaptSpringPage<PaymentAttempt>(raw, this.page(), this.size);
                this.pagos.set(res.content);
                this.totalElements.set(res.totalElements);
                this.totalPages.set(res.totalPages);
                this.isLoading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.errorMessage.set('Error al cargar el historial de pagos: ' + mensajeDeErrorHttp(err));
                this.isLoading.set(false);
            }
        });
    }

    irAPagina(p: number): void {
        this.page.set(p);
        this.loadHistorial();
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
