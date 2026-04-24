import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { CustomerService } from '@features/admin/services/customer.service';
import { CustomerDashboard } from '@features/admin/models/customer.model';
import { AuthService } from '@core/auth/auth.service';

@Component({
    selector: 'app-customer-dashboard',
    standalone: true,
    imports: [PageHeaderComponent],
    templateUrl: './customer-dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboardComponent implements OnInit {
    private readonly customerService = inject(CustomerService);
    private readonly authService = inject(AuthService);

    dashboard = signal<CustomerDashboard | null>(null);
    loading = signal(true);

    breadcrumbs = [
        { label: 'Admin', url: '/admin' },
        { label: 'Clientes', url: '/admin/customers' },
        { label: 'Dashboard' },
    ];

    ngOnInit(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (!companyId) return;

        this.customerService.getDashboard(companyId).subscribe({
            next: (d) => { this.dashboard.set(d); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }
}
