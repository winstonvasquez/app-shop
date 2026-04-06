import {
    Component, OnInit, ChangeDetectionStrategy, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerService } from '@features/admin/services/customer.service';
import {
    CustomerResponse,
    TIPO_CLIENTE_OPTIONS,
    CONDICION_PAGO_OPTIONS,
} from '@features/admin/models/customer.model';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { AuthService } from '@core/auth/auth.service';
import { CustomerFormComponent } from '../customer-form/customer-form.component';

@Component({
    selector: 'app-customer-list',
    standalone: true,
    imports: [FormsModule, RouterLink, PageHeaderComponent, PaginationComponent, CustomerFormComponent],
    templateUrl: './customer-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerListComponent implements OnInit {
    private readonly customerService = inject(CustomerService);
    private readonly authService = inject(AuthService);

    customers = signal<CustomerResponse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    searchQuery = signal('');
    sortField = signal('id');
    sortDirection = signal<'asc' | 'desc'>('desc');

    showDrawer = signal(false);
    editingCustomer = signal<CustomerResponse | null>(null);

    selectedIds = signal<Set<number>>(new Set());
    showBulkSegment = signal(false);

    isEmpty = computed(() => !this.loading() && this.customers().length === 0);

    tipoClienteOptions = TIPO_CLIENTE_OPTIONS;
    condicionPagoOptions = CONDICION_PAGO_OPTIONS;

    breadcrumbs = [
        { label: 'Admin', url: '/admin' },
        { label: 'Clientes' },
    ];

    ngOnInit(): void {
        this.loadCustomers();
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
            .getAll(companyId, this.currentPage(), this.pageSize(), sort, this.searchQuery() || undefined)
            .subscribe({
                next: (res) => {
                    this.customers.set(res.content);
                    this.totalElements.set(res.page.totalElements);
                    this.totalPages.set(res.page.totalPages);
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
                this.loadCustomers();
            },
        });
    }

    onDeactivate(customer: CustomerResponse): void {
        if (!confirm(`¿Desactivar al cliente "${customer.nombreCompleto}"?`)) return;

        this.customerService.deactivate(customer.id).subscribe({
            next: () => this.loadCustomers(),
            error: (err: Error) => this.error.set(err.message),
        });
    }
}
