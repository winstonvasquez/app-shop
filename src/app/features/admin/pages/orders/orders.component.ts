import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';
import { OrderStatus, ORDER_STATUSES, OrderDetail } from '@features/admin/models/order.model';
import { PaginationConfig, PageResponse } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent } from '@shared/ui/tables/data-table/data-table.component';
import { ModalComponent } from '@shared/ui/modals/modal/modal.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    CurrencyPipe,
    DataTableComponent,
    ModalComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './orders.component.html'
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  // Data Signals
  orders = signal<OrderResponse[]>([]);
  selectedOrder = signal<OrderResponse | null>(null);

  // UI State Signals
  loading = signal(false);
  loadingDetails = signal(false); // Para el modal
  error = signal<string | null>(null);
  showModal = signal(false);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  // Constants
  orderStatuses = ORDER_STATUSES;

  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [
    { label: 'Admin', url: '/admin' },
    { label: 'Pedidos' }
  ];

  // Table columns configuration
  columns: TableColumn<OrderResponse>[] = [
    { key: 'id', label: 'ID', sortable: true, width: '80px' },
    {
      key: 'fechaPedido',
      label: 'Fecha',
      sortable: true,
      render: (row) => new Date(row.fechaPedido).toLocaleDateString('es-ES')
    },
    {
      key: 'userId',
      label: 'Cliente',
      render: (row) => `Usuario #${row.userId}`
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      align: 'right',
      render: (row) => `$${row.total.toFixed(2)}`
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      render: (row) => this.getStatusLabel(row.estado)
    }
  ];

  // Table actions configuration
  actions: TableAction<OrderResponse>[] = [
    {
      label: 'Ver Detalles',
      icon: '👁️',
      onClick: (row) => this.openDetails(row.id),
      class: 'btn-view'
    }
  ];

  // Sort state
  sortField = signal('fechaPedido');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Computed properties
  hasOrders = computed(() => this.orders().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasOrders());

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    const pagination: PaginationConfig = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: { field: 'fechaPedido', direction: 'desc' }
    };

    this.orderService.getAll(pagination).subscribe({
      next: (response) => {
        this.orders.set(response.content);
        this.totalElements.set(response.totalElements);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: PaginationEvent | number): void {
    if (typeof event === 'number') {
      this.currentPage.set(event);
    } else {
      this.currentPage.set(event.page);
      this.pageSize.set(event.size);
    }
    this.loadOrders();
  }

  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadOrders();
  }

  getStatusLabel(status: string): string {
    const statusObj = this.orderStatuses.find(s => s.value === status);
    return statusObj?.label || status;
  }

  openDetails(orderId: number): void {
    this.loadingDetails.set(true);
    this.showModal.set(true);
    this.selectedOrder.set(null); // Clear previous

    this.orderService.getById(orderId).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.loadingDetails.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loadingDetails.set(false);
        this.closeModal();
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedOrder.set(null);
  }

  updateStatus(newStatus: string): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.loadingDetails.set(true); // Reusamos flag de carga modal

    this.orderService.updateStatus(order.id, { estado: newStatus as OrderStatus }).subscribe({
      next: (updatedOrder) => {
        // Actualizar la orden en la lista local para reflejar el cambio sin recargar todo
        this.orders.update(current =>
          current.map(o => o.id === updatedOrder.id ? { ...o, estado: updatedOrder.estado } : o)
        );
        this.selectedOrder.set(updatedOrder); // Actualizar modal
        this.loadingDetails.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo actualizar el estado: ' + err.message);
        this.loadingDetails.set(false);
      }
    });
  }

  getDetailsTotal(detalles: OrderDetail[] | undefined): number {
    return detalles?.reduce((acc, curr) => acc + curr.subtotal, 0) || 0;
  }
}
