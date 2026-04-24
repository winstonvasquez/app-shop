import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';

@Component({
  selector: 'app-menu-orders',
  standalone: true,
  imports: [],
  templateUrl: './menu-orders.component.html',
  styleUrl: './menu-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOrders implements OnInit {
  private router = inject(Router);
  private orderService = inject(OrderService);

  recentOrders = signal<OrderResponse[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadRecentOrders();
  }

  loadRecentOrders(): void {
    this.loading.set(true);
    this.orderService.getAll({ page: 0, size: 3 }).subscribe({
      next: (page) => {
        this.recentOrders.set(page.content ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  goToOrders(): void {
    this.router.navigate(['/account/orders']);
  }
}
