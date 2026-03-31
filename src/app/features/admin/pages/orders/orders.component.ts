import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';
import { OrderStatus, OrderDetail } from '@features/admin/models/order.model';
import { VentasParametrosService } from '../../services/ventas-parametros.service';
import { PaginationConfig, PageResponse } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
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
    TranslateModule,
    DataTableComponent,
    PaginationComponent,
    DrawerComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './orders.component.html'
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly translate = inject(TranslateService);
  private readonly parametros = inject(VentasParametrosService);

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

  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [
    { label: 'Admin', url: '/admin' },
    { label: 'Pedidos' }
  ];

  // Table columns configuration — labels initialized in ngOnInit() with translations
  columns: TableColumn<OrderResponse>[] = [];

  // Table actions configuration — label initialized in ngOnInit() with translations
  actions: TableAction<OrderResponse>[] = [];

  // Sort state
  sortField = signal('fechaPedido');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Computed properties
  hasOrders = computed(() => this.orders().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasOrders());

  ngOnInit(): void {
    this.columns = [
      { key: 'id', label: this.translate.instant('admin.orders.colId'), sortable: true, width: '80px' },
      {
        key: 'fechaPedido',
        label: this.translate.instant('admin.orders.colFecha'),
        sortable: true,
        render: (row) => new Date(row.fechaPedido).toLocaleDateString('es-PE')
      },
      {
        key: 'usuarioId',
        label: this.translate.instant('admin.orders.colCliente'),
        render: (row) => `Usuario #${row.usuarioId}`
      },
      {
        key: 'total',
        label: this.translate.instant('admin.orders.colTotal'),
        sortable: true,
        align: 'right',
        render: (row) => `S/ ${row.total.toFixed(2)}`
      },
      {
        key: 'estado',
        label: this.translate.instant('admin.orders.colEstado'),
        sortable: true,
        html: true,
        render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoPedido(row.estado)}">${this.parametros.getLabelEstadoPedido(row.estado)}</span>`
      }
    ];
    this.actions = [
      {
        label: this.translate.instant('admin.orders.verDetalles'),
        icon: '👁️',
        onClick: (row) => this.openDetails(row.id),
        class: 'btn-view'
      }
    ];
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
        // Spring Boot 3.3+ puede anidar metadatos en "page": { totalElements, totalPages }
        const raw = response as any;
        this.totalElements.set(response.totalElements ?? raw.page?.totalElements ?? 0);
        this.totalPages.set(response.totalPages ?? raw.page?.totalPages ?? 0);
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

  onPaginationChange(event: PaginationChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    this.loadOrders();
  }

  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadOrders();
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
