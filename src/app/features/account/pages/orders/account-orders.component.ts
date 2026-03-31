import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { OrderResponse } from '@core/models/order.model';
import { PageResponse } from '@core/models/pagination.model';

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, BreadcrumbComponent],
  templateUrl: './account-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrdersComponent implements OnInit {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrls.sales}/api/pedidos/mis-pedidos`;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: ['/home'] },
    { label: 'Mi Cuenta' },
    { label: 'Mis Pedidos' }
  ];

  orders = signal<OrderResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  totalPages = signal(0);
  currentPage = signal(0);

  ngOnInit(): void {
    this.loadOrders(0);
  }

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
        this.totalPages.set(response.totalPages);
        this.currentPage.set(response.number);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar los pedidos.');
        this.loading.set(false);
      }
    });
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.loadOrders(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.loadOrders(this.currentPage() + 1);
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': 'badge badge-warning',
      'PAGADO': 'badge badge-accent',
      'EN_PREPARACION': 'badge badge-accent',
      'ENVIADO': 'badge badge-accent',
      'ENTREGADO': 'badge badge-success',
      'CANCELADO': 'badge badge-error',
    };
    return map[estado] ?? 'badge badge-neutral';
  }
}
