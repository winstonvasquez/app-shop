import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { OrderResponse } from '@core/models/order.model';
import { PageResponse, pageTotalPages } from '@core/models/pagination.model';
import { AuthService } from '@core/auth/auth.service';
import {
    DsAccountShellComponent,
    DsButtonComponent,
    DsBadgeComponent,
    DsBadgeTone,
} from '@shared/ui/ds';

@Component({
    selector: 'app-account-orders',
    standalone: true,
    imports: [
        RouterLink,
        DatePipe,
        DecimalPipe,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
        DsBadgeComponent,
    ],
    templateUrl: './account-orders.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrdersComponent implements OnInit {
    private http        = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/pedidos/mis-pedidos`;

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    orders      = signal<OrderResponse[]>([]);
    loading     = signal(true);
    error       = signal<string | null>(null);
    totalPages  = signal(0);
    currentPage = signal(0);

    ngOnInit(): void { this.loadOrders(0); }

    loadOrders(page: number): void {
        this.loading.set(true);
        this.error.set(null);
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', '10')
            .set('sort', 'fechaPedido,desc');

        this.http.get<PageResponse<OrderResponse>>(this.baseUrl, { params }).subscribe({
            next: (response) => {
                this.orders.set(response.content ?? []);
                this.totalPages.set(pageTotalPages(response));
                this.currentPage.set(response.number);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Error al cargar los pedidos.');
                this.loading.set(false);
            },
        });
    }

    prevPage(): void { if (this.currentPage() > 0)                  this.loadOrders(this.currentPage() - 1); }
    nextPage(): void { if (this.currentPage() < this.totalPages()-1) this.loadOrders(this.currentPage() + 1); }

    estadoTone(estado: string): DsBadgeTone {
        const map: Record<string, DsBadgeTone> = {
            'PENDIENTE':      'warn',
            'PAGADO':         'info',
            'EN_PREPARACION': 'info',
            'ENVIADO':        'info',
            'ENTREGADO':      'success',
            'CANCELADO':      'danger',
        };
        return map[estado] ?? 'neutral';
    }

    estadoLabel(estado: string): string {
        const map: Record<string, string> = {
            'PENDIENTE':      'Pendiente',
            'PAGADO':         'Pagado',
            'EN_PREPARACION': 'En preparación',
            'ENVIADO':        'Enviado',
            'ENTREGADO':      'Entregado',
            'CANCELADO':      'Cancelado',
        };
        return map[estado] ?? estado;
    }
}
