import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StockReservationService } from '../../services/stock-reservation.service';
import { StockReservation, ReservationStatus } from '../../models/stock-reservation.model';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import {
    DataTableComponent, TableColumn, TableAction, PaginationEvent,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';

/**
 * Listado REAL de reservas de stock (ronda de filtros 2026-07-27).
 * Antes esta página era un lookup exacto por `orderId` (sin listado, sin paginación,
 * sin filtros) — ahora consume `GET /logistics/api/stock-reservations` (endpoint NUEVO,
 * paginado, con filtros server-side). El detalle de un pedido concreto queda como acción
 * de fila (drawer), reutilizando `GET /order/{orderId}`.
 */
@Component({
    selector: 'app-stock-reservations',
    standalone: true,
    imports: [DatePipe, ButtonComponent, DrawerComponent, AlertComponent, PageHeaderComponent, DataTableComponent],
    templateUrl: './stock-reservations.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockReservationsComponent implements OnInit {
    private readonly reservationService = inject(StockReservationService);
    readonly catalog = inject(CatalogService);

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Reservas de Stock' }
    ];

    loading    = signal(false);
    error      = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    reservations = signal<StockReservation[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterStatus = signal('');
    filterExpiresAtDesde = signal<string | null>(null);
    filterExpiresAtHasta = signal<string | null>(null);
    filterReleasedAtDesde = signal<string | null>(null);
    filterReleasedAtHasta = signal<string | null>(null);
    filterConsumedAtDesde = signal<string | null>(null);
    filterConsumedAtHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtro select del toolbar. El estado sale de erp_parameters (ESTADO_RESERVA_STOCK).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_RESERVA_STOCK', 'status', 'Estado')
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'expiresAt', label: 'Fecha de expiración' },
        { field: 'releasedAt', label: 'Fecha de liberación' },
        { field: 'consumedAt', label: 'Fecha de consumo' }
    ];

    columns: TableColumn<StockReservation>[] = [
        {
            key: 'orderId', label: 'Pedido', html: true,
            render: r => `<span class="font-mono text-sm" style="color:var(--color-text-muted)">${r.orderId.slice(0, 8)}…</span>`
        },
        { key: 'sku', label: 'SKU' },
        { key: 'cantidad', label: 'Cantidad', align: 'right' },
        {
            key: 'status', label: 'Estado', html: true,
            render: r => `<span class="px-2 py-0.5 rounded text-xs font-medium ${this.statusClass(r.status)}">${this.catalog.label('ESTADO_RESERVA_STOCK', r.status)}</span>`
        },
        {
            key: 'expiresAt', label: 'Expira',
            render: r => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('es-PE') : '—'
        },
        {
            key: 'fechaCreacion', label: 'Reservado',
            render: r => r.fechaCreacion ? new Date(r.fechaCreacion).toLocaleDateString('es-PE') : '—'
        },
    ];

    actions: TableAction<StockReservation>[] = [
        { label: 'Ver pedido', icon: 'view', class: 'btn-view', onClick: r => this.openDetail(r.orderId) },
        {
            label: 'Liberar', icon: 'x', class: 'btn-view',
            show: r => r.status === 'RESERVED',
            onClick: r => this.releaseFromRow(r.orderId)
        },
        {
            label: 'Consumir', icon: 'check', class: 'btn-view',
            show: r => r.status === 'RESERVED',
            onClick: r => this.consumeFromRow(r.orderId)
        }
    ];

    // ── Drawer de detalle (todas las líneas del pedido elegido) ────────────
    showDetail = signal(false);
    detailLoading = signal(false);
    detailOrderId = signal<string | null>(null);
    detailRows = signal<StockReservation[]>([]);
    detailActionId = signal<string | null>(null);

    detailEstadoGlobal = computed<ReservationStatus | null>(() => {
        const rows = this.detailRows();
        if (rows.length === 0) return null;
        return rows.some(r => r.status === 'RESERVED') ? 'RESERVED' : rows[0].status;
    });

    detailTotalUnidades = computed(() => this.detailRows().reduce((acc, r) => acc + (r.cantidad ?? 0), 0));

    ngOnInit(): void {
        this.loadReservations();
    }

    loadReservations(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reservationService.listar({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            status: (this.filterStatus() || undefined) as ReservationStatus | undefined,
            expiresAtDesde: this.filterExpiresAtDesde() || undefined,
            expiresAtHasta: this.filterExpiresAtHasta() || undefined,
            releasedAtDesde: this.filterReleasedAtDesde() || undefined,
            releasedAtHasta: this.filterReleasedAtHasta() || undefined,
            consumedAtDesde: this.filterConsumedAtDesde() || undefined,
            consumedAtHasta: this.filterConsumedAtHasta() || undefined,
        }).subscribe({
            next: (res) => {
                this.reservations.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las reservas de stock');
                this.loading.set(false);
            }
        });
    }

    /** La búsqueda por texto (SKU/motivo) va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadReservations();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'status') return;
        this.filterStatus.set(event.value != null ? String(event.value) : '');
        this.currentPage.set(0);
        this.loadReservations();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'expiresAt':
                this.filterExpiresAtDesde.set(event.from);
                this.filterExpiresAtHasta.set(event.to);
                break;
            case 'releasedAt':
                this.filterReleasedAtDesde.set(event.from);
                this.filterReleasedAtHasta.set(event.to);
                break;
            case 'consumedAt':
                this.filterConsumedAtDesde.set(event.from);
                this.filterConsumedAtHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadReservations();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterExpiresAtDesde.set(null);
        this.filterExpiresAtHasta.set(null);
        this.filterReleasedAtDesde.set(null);
        this.filterReleasedAtHasta.set(null);
        this.filterConsumedAtDesde.set(null);
        this.filterConsumedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadReservations();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadReservations();
    }

    // ── Detalle por pedido (acción de fila) ─────────────────────────────────
    openDetail(orderId: string): void {
        this.detailOrderId.set(orderId);
        this.detailRows.set([]);
        this.showDetail.set(true);
        this.detailLoading.set(true);
        this.reservationService.getByOrder(orderId).subscribe({
            next: (res) => {
                this.detailRows.set(res ?? []);
                this.detailLoading.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el detalle del pedido');
                this.detailLoading.set(false);
            }
        });
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.detailOrderId.set(null);
        this.detailRows.set([]);
    }

    releaseFromRow(orderId: string): void {
        this.reservationService.release(orderId, 'Liberado manualmente').subscribe({
            next: () => {
                this.showSuccess('Reservas liberadas correctamente');
                this.loadReservations();
                if (this.detailOrderId() === orderId) this.openDetail(orderId);
            },
            error: () => this.error.set('Error al liberar la reserva')
        });
    }

    consumeFromRow(orderId: string): void {
        this.reservationService.consume(orderId).subscribe({
            next: () => {
                this.showSuccess('Reservas consumidas correctamente');
                this.loadReservations();
                if (this.detailOrderId() === orderId) this.openDetail(orderId);
            },
            error: () => this.error.set('Error al consumir la reserva')
        });
    }

    releaseDetail(): void {
        const orderId = this.detailOrderId();
        if (!orderId) return;
        this.detailActionId.set('release');
        this.reservationService.release(orderId, 'Liberado manualmente').subscribe({
            next: () => {
                this.detailActionId.set(null);
                this.showSuccess('Reservas liberadas correctamente');
                this.openDetail(orderId);
                this.loadReservations();
            },
            error: () => {
                this.error.set('Error al liberar la reserva');
                this.detailActionId.set(null);
            }
        });
    }

    consumeDetail(): void {
        const orderId = this.detailOrderId();
        if (!orderId) return;
        this.detailActionId.set('consume');
        this.reservationService.consume(orderId).subscribe({
            next: () => {
                this.detailActionId.set(null);
                this.showSuccess('Reservas consumidas correctamente');
                this.openDetail(orderId);
                this.loadReservations();
            },
            error: () => {
                this.error.set('Error al consumir la reserva');
                this.detailActionId.set(null);
            }
        });
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), NOTIFICATION_DURATION.medium);
    }

    statusClass(status: ReservationStatus): string {
        switch (status) {
            case 'RESERVED': return 'bg-info/10 text-info';
            case 'RELEASED': return 'bg-gray-100 text-gray-600';
            case 'CONSUMED': return 'bg-success/10 text-success';
            case 'EXPIRED':  return 'bg-error/10 text-error';
            default:         return 'bg-gray-100 text-gray-600';
        }
    }

    canReleaseDetail(): boolean {
        return this.detailEstadoGlobal() === 'RESERVED';
    }

    canConsumeDetail(): boolean {
        return this.detailEstadoGlobal() === 'RESERVED';
    }
}
