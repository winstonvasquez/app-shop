import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';
import { OrderStatus, OrderDetail } from '@features/admin/models/order.model';
import { VentasParametrosService } from '../../services/ventas-parametros.service';
import { PaginationConfig } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { ButtonComponent } from '@shared/components';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    DatePipe,
    CurrencyPipe,
    TranslateModule,
    DataTableComponent,
    DrawerComponent,
    PageHeaderComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    ButtonComponent
  ],
  templateUrl: './orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly translate = inject(TranslateService);
  private readonly parametros = inject(VentasParametrosService);
  readonly catalog = inject(CatalogService);

  // Data Signals
  orders = signal<OrderResponse[]>([]);
  selectedOrder = signal<OrderResponse | null>(null);

  // UI State Signals
  loading = signal(false);
  loadingDetails = signal(false); // Para el modal
  error = signal<string | null>(null);
  showModal = signal(false);
  searchQuery = signal('');

  // Pagination
  currentPage = signal(0);
  pageSize = signal(20);
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

  // Filtros server-side (TODOS van al backend — la vista nunca filtra la página cargada)
  filterEstado = signal('');
  filterCpeTipo = signal('');
  filterCpeEstado = signal('');
  filterMetodoPago = signal('');
  filterEstadoPago = signal('');
  filterFechaPedidoDesde = signal<string | undefined>(undefined);
  filterFechaPedidoHasta = signal<string | undefined>(undefined);
  filterCpeFechaEmisionDesde = signal<string | undefined>(undefined);
  filterCpeFechaEmisionHasta = signal<string | undefined>(undefined);

  // Filtros select del toolbar. `estado` usa el endpoint de parámetros ya existente;
  // el resto sale de erp_parameters (fuente única) vía CatalogService.
  readonly filters: FilterConfig[] = [
    {
      field: 'estado',
      label: 'Estado',
      options: this.parametros.getEstadosPedido()
    },
    catalogFilter(this.catalog, 'TIPO_CPE', 'cpeTipo', 'Tipo de comprobante'),
    catalogFilter(this.catalog, 'ESTADO_CPE_SUNAT', 'cpeEstado', 'Estado CPE (SUNAT)'),
    // OJO (riesgo documentado): el catálogo METODO_PAGO en erp_parameters (TRANSFERENCIA/
    // CHEQUE/EFECTIVO) no es 1:1 con PagoEntity.MetodoPago (TARJETA_CREDITO/TARJETA_DEBITO/
    // PAYPAL/TRANSFERENCIA_BANCARIA/EFECTIVO/YAPE/PLIN/BILLETERA_DIGITAL) contra el que compara
    // el backend (PedidoRepository: CAST(pg.metodoPago AS String) = :metodoPago). Solo
    // "Efectivo" calzará; el resto de opciones del catálogo devolverá 0 filas hasta que se
    // reconcilien los códigos (fuera de alcance de este cableado, que es 100% frontend).
    catalogFilter(this.catalog, 'METODO_PAGO', 'metodoPago', 'Método de pago'),
    // ESTADO_PAGO no existe como catálogo en erp_parameters (no confundir con
    // ESTADO_INTENTO_PAGO, que es otro dominio) -> staticFilter con los valores EXACTOS
    // de PagoEntity.EstadoPago.
    staticFilter('estadoPago', 'Estado del pago', [
      { value: 'PENDIENTE', label: 'Pendiente' },
      { value: 'COMPLETADO', label: 'Completado' },
      { value: 'FALLIDO', label: 'Fallido' },
      { value: 'REEMBOLSADO', label: 'Reembolsado' }
    ])
  ];

  readonly dateRangeFilters: DateRangeFilterConfig[] = [
    { field: 'fechaPedido', label: 'Fecha de pedido' },
    { field: 'cpeFechaEmision', label: 'Fecha de emisión CPE' }
  ];

  /**
   * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
   * (respeta TODOS los filtros actuales). Ver GET /api/pedidos/export.
   */
  readonly exportConfig: BackendExportConfig = {
    url: `${environment.apiUrls.sales}/api/pedidos/export`,
    filename: 'pedidos',
    params: () => ({
      search: this.searchQuery() || undefined,
      estado: this.filterEstado() || undefined,
      cpeTipo: this.filterCpeTipo() || undefined,
      cpeEstado: this.filterCpeEstado() || undefined,
      metodoPago: this.filterMetodoPago() || undefined,
      estadoPago: this.filterEstadoPago() || undefined,
      fechaPedidoDesde: this.filterFechaPedidoDesde(),
      fechaPedidoHasta: this.filterFechaPedidoHasta(),
      cpeFechaEmisionDesde: this.filterCpeFechaEmisionDesde(),
      cpeFechaEmisionHasta: this.filterCpeFechaEmisionHasta()
    }),
  };

  // Computed properties
  hasOrders = computed(() => this.orders().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasOrders());

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => {
        this.searchQuery.set(value);
        this.currentPage.set(0);
        this.loadOrders();
      });
  }

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
        render: (row) => `${CURRENCY_DISPLAY.SYMBOL_PEN} ${row.total.toFixed(2)}`
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

  onSearchTerm(term: string): void {
    this.searchInput$.next(term);
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    const pagination: PaginationConfig = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: { field: this.sortField() || 'fechaPedido', direction: this.sortDirection() }
    };

    this.orderService.getAll(pagination, this.searchQuery() || undefined, {
      estado: this.filterEstado() || undefined,
      cpeTipo: this.filterCpeTipo() || undefined,
      cpeEstado: this.filterCpeEstado() || undefined,
      metodoPago: this.filterMetodoPago() || undefined,
      estadoPago: this.filterEstadoPago() || undefined,
      fechaPedidoDesde: this.filterFechaPedidoDesde(),
      fechaPedidoHasta: this.filterFechaPedidoHasta(),
      cpeFechaEmisionDesde: this.filterCpeFechaEmisionDesde(),
      cpeFechaEmisionHasta: this.filterCpeFechaEmisionHasta()
    }).subscribe({
      next: (response) => {
        this.orders.set(response.content);
        // Spring Boot 3.3+ puede anidar metadatos en "page": { totalElements, totalPages }
        const raw = response as { page?: { totalElements?: number; totalPages?: number } };
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

  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadOrders();
  }

  /** Selects del toolbar: estado, tipo/estado de CPE, método/estado de pago. Todos van al backend. */
  onFilterChangeEvent(event: FilterChangeEvent): void {
    const valor = event.value != null ? String(event.value) : '';
    switch (event.field) {
      case 'estado':      this.filterEstado.set(valor); break;
      case 'cpeTipo':     this.filterCpeTipo.set(valor); break;
      case 'cpeEstado':   this.filterCpeEstado.set(valor); break;
      case 'metodoPago':  this.filterMetodoPago.set(valor); break;
      case 'estadoPago':  this.filterEstadoPago.set(valor); break;
      default: return;
    }
    this.currentPage.set(0);
    this.loadOrders();
  }

  /** Rangos de fecha del toolbar: fecha de pedido y fecha de emisión del CPE. */
  onDateRangeChange(event: DateRangeChangeEvent): void {
    switch (event.field) {
      case 'fechaPedido':
        this.filterFechaPedidoDesde.set(event.from ?? undefined);
        this.filterFechaPedidoHasta.set(event.to ?? undefined);
        break;
      case 'cpeFechaEmision':
        this.filterCpeFechaEmisionDesde.set(event.from ?? undefined);
        this.filterCpeFechaEmisionHasta.set(event.to ?? undefined);
        break;
      default: return;
    }
    this.currentPage.set(0);
    this.loadOrders();
  }

  /** "Limpiar filtros": resetea TODOS los signals y recarga UNA sola vez. */
  onFiltersClear(): void {
    this.searchQuery.set('');
    this.filterEstado.set('');
    this.filterCpeTipo.set('');
    this.filterCpeEstado.set('');
    this.filterMetodoPago.set('');
    this.filterEstadoPago.set('');
    this.filterFechaPedidoDesde.set(undefined);
    this.filterFechaPedidoHasta.set(undefined);
    this.filterCpeFechaEmisionDesde.set(undefined);
    this.filterCpeFechaEmisionHasta.set(undefined);
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
