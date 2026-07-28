import {
    Component, OnInit, ChangeDetectionStrategy, inject, signal, computed
} from '@angular/core';

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '@features/admin/services/customer.service';
import { SegmentService } from '@features/admin/services/segment.service';
import {
    CustomerResponse,
    TIPO_CLIENTE_OPTIONS,
    CONDICION_PAGO_OPTIONS,
} from '@features/admin/models/customer.model';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import {
    DataTableComponent, TableColumn, TableAction,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

@Component({
    selector: 'app-customer-list',
    standalone: true,
    imports: [PageHeaderComponent, DataTableComponent, CustomerFormComponent, ButtonComponent, CatalogSelectComponent, FormsModule],
    templateUrl: './customer-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerListComponent implements OnInit {
    private readonly customerService = inject(CustomerService);
    private readonly segmentService = inject(SegmentService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    readonly catalog = inject(CatalogService);

    customers = signal<CustomerResponse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    searchQuery = signal('');
    sortField = signal('id');
    sortDirection = signal<'asc' | 'desc'>('desc');

    // Filtros server-side (TODOS van al backend — la vista nunca filtra la página cargada)
    filterTipoCliente = signal('');
    filterCondicionPago = signal('');
    filterTipoDocumento = signal('');
    filterSegmentoId = signal('');
    filterActivo = signal('');
    filterConCredito = signal('');
    filterFechaCreacionDesde = signal<string | undefined>(undefined);
    filterFechaCreacionHasta = signal<string | undefined>(undefined);

    /** Segmentos para el select de filtro del toolbar (lista chica, no requiere server-search). */
    segmentosFiltro = signal<{ id: number; nombre: string }[]>([]);

    readonly filters: FilterConfig[] = [
        staticFilter('tipoCliente', 'Tipo', TIPO_CLIENTE_OPTIONS.map(o => ({ value: o.value, label: o.label }))),
        catalogFilter(this.catalog, 'CONDICION_PAGO', 'condicionPago', 'Cond. de pago'),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento'),
        signalFilter('segmentoId', 'Segmento', this.segmentosFiltro,
            s => ({ value: s.id, label: s.nombre })),
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
        staticFilter('conCredito', 'Con línea de crédito', [
            { value: 'true', label: 'Con crédito' },
            { value: 'false', label: 'Sin crédito' }
        ])
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de registro' }
    ];

    showDrawer = signal(false);
    editingCustomer = signal<CustomerResponse | null>(null);

    selectedIds = signal<Set<number>>(new Set());

    // Columnas del data-table estándar
    columns: TableColumn<CustomerResponse>[] = [
        { key: 'numeroDocumento', label: 'Documento', html: true,
          render: (c) => `<span class="badge badge-neutral">${c.tipoDocumento}</span> ${c.numeroDocumento}` },
        { key: 'nombreCompleto', label: 'Nombre / Razón Social', sortable: true,
          html: true, render: (c) => `<span class="font-medium">${c.nombreCompleto}</span>` },
        { key: 'tipoCliente', label: 'Tipo', html: true,
          render: (c) => c.tipoCliente === 'PERSONA_JURIDICA'
              ? '<span class="badge badge-accent">Empresa</span>'
              : '<span class="badge badge-neutral">Natural</span>' },
        { key: 'email', label: 'Email', render: (c) => c.email || '-' },
        { key: 'celular', label: 'Teléfono', render: (c) => c.celular || c.telefono || '-' },
        { key: 'condicionPago', label: 'Cond. Pago', html: true,
          render: (c) => `<span class="badge badge-neutral">${c.condicionPago}</span>` },
        { key: 'limiteCredito', label: 'Crédito', align: 'right',
          render: (c) => c.limiteCredito > 0
              ? `${CURRENCY_DISPLAY.SYMBOL_PEN} ${c.saldoCredito.toFixed(2)} / ${c.limiteCredito.toFixed(2)}` : '-' }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.sales}/api/clientes/export`,
        filename: 'clientes',
        params: () => ({
            companyId: this.authService.currentUser()?.activeCompanyId ?? undefined,
            search: this.searchQuery() || undefined,
            tipoCliente: this.filterTipoCliente() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            tipoDocumento: this.filterTipoDocumento() || undefined,
            segmentoId: this.filterSegmentoId() || undefined,
            activo: this.filterActivo() || undefined,
            conCredito: this.filterConCredito() || undefined,
            fechaCreacionDesde: this.filterFechaCreacionDesde(),
            fechaCreacionHasta: this.filterFechaCreacionHasta(),
        }),
    };

    actions: TableAction<CustomerResponse>[] = [
        { label: 'Ver detalle', icon: 'view', class: 'btn-view',
          onClick: (c) => this.router.navigate(['/admin/customers', c.id]) },
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (c) => this.openEdit(c) },
        { label: 'Desactivar', icon: 'delete', class: 'btn-icon-delete', onClick: (c) => this.onDeactivate(c) }
    ];

    onSelectionChange(rows: CustomerResponse[]): void {
        this.selectedIds.set(new Set(rows.map(r => r.id)));
    }
    showBulkSegment = signal(false);
    bulkSegmentoId = signal('');

    isEmpty = computed(() => !this.loading() && this.customers().length === 0);

    tipoClienteOptions = TIPO_CLIENTE_OPTIONS;
    condicionPagoOptions = CONDICION_PAGO_OPTIONS;

    breadcrumbs = [
        { label: 'Admin', url: '/admin' },
        { label: 'Clientes' },
    ];

    ngOnInit(): void {
        this.loadCustomers();
        this.loadSegmentosFiltro();
    }

    /** Segmentos activos para el select de filtro del toolbar. */
    private loadSegmentosFiltro(): void {
        this.segmentService.getAll({ page: 0, size: 100 }).subscribe({
            next: (res) => this.segmentosFiltro.set((res.content ?? []).map(s => ({ id: s.id, nombre: s.nombre }))),
            error: () => this.segmentosFiltro.set([])
        });
    }

    loadCustomers(): void {
        this.loading.set(true);
        this.error.set(null);

        const companyId = this.authService.currentUser()?.activeCompanyId ?? null;
        if (!companyId) {
            this.loading.set(false);
            return;
        }

        const sort = `${this.sortField()},${this.sortDirection()}`;
        this.customerService
            .getAll(companyId, this.currentPage(), this.pageSize(), sort, this.searchQuery() || undefined, {
                tipoCliente: this.filterTipoCliente() || undefined,
                condicionPago: this.filterCondicionPago() || undefined,
                tipoDocumento: this.filterTipoDocumento() || undefined,
                segmentoId: this.filterSegmentoId() || undefined,
                activo: this.filterActivo() || undefined,
                conCredito: this.filterConCredito() || undefined,
                fechaCreacionDesde: this.filterFechaCreacionDesde(),
                fechaCreacionHasta: this.filterFechaCreacionHasta(),
            })
            .subscribe({
                next: (res) => {
                    this.customers.set(res.content);
                    this.totalElements.set(pageTotalElements(res));
                    this.totalPages.set(pageTotalPages(res));
                    this.loading.set(false);
                },
                error: (err: Error) => {
                    this.error.set(err.message);
                    this.loading.set(false);
                },
            });
    }

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(0);
        this.loadCustomers();
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadCustomers();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'tipoCliente':   this.filterTipoCliente.set(valor); break;
            case 'condicionPago': this.filterCondicionPago.set(valor); break;
            case 'tipoDocumento': this.filterTipoDocumento.set(valor); break;
            case 'segmentoId':    this.filterSegmentoId.set(valor); break;
            case 'activo':        this.filterActivo.set(valor); break;
            case 'conCredito':    this.filterConCredito.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadCustomers();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaCreacion') return;
        this.filterFechaCreacionDesde.set(event.from ?? undefined);
        this.filterFechaCreacionHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.loadCustomers();
    }

    /** "Limpiar filtros": resetea TODOS los signals y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipoCliente.set('');
        this.filterCondicionPago.set('');
        this.filterTipoDocumento.set('');
        this.filterSegmentoId.set('');
        this.filterActivo.set('');
        this.filterConCredito.set('');
        this.filterFechaCreacionDesde.set(undefined);
        this.filterFechaCreacionHasta.set(undefined);
        this.currentPage.set(0);
        this.loadCustomers();
    }

    openCreate(): void {
        this.editingCustomer.set(null);
        this.showDrawer.set(true);
    }

    openEdit(customer: CustomerResponse): void {
        this.editingCustomer.set(customer);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.editingCustomer.set(null);
    }

    onSaved(): void {
        this.closeDrawer();
        this.loadCustomers();
    }

    toggleSelect(id: number): void {
        const current = new Set(this.selectedIds());
        if (current.has(id)) current.delete(id); else current.add(id);
        this.selectedIds.set(current);
    }

    toggleSelectAll(): void {
        if (this.selectedIds().size === this.customers().length) {
            this.selectedIds.set(new Set());
        } else {
            this.selectedIds.set(new Set(this.customers().map(c => c.id)));
        }
    }

    assignSegment(segmentoId: number): void {
        const ids = Array.from(this.selectedIds());
        if (ids.length === 0) return;
        this.customerService.bulkAssignSegment(ids, segmentoId).subscribe({
            next: () => {
                this.selectedIds.set(new Set());
                this.showBulkSegment.set(false);
                this.bulkSegmentoId.set('');
                this.loadCustomers();
            },
        });
    }

    onBulkSegmentoChange(value: string): void {
        this.bulkSegmentoId.set(value);
        if (!value) return;
        this.assignSegment(+value);
    }

    onDeactivate(customer: CustomerResponse): void {
        if (!confirm(`¿Desactivar al cliente "${customer.nombreCompleto}"?`)) return;

        this.customerService.deactivate(customer.id).subscribe({
            next: () => this.loadCustomers(),
            error: (err: Error) => this.error.set(err.message),
        });
    }
}
