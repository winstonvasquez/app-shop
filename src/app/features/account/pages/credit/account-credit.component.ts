import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CreditService, CreditTransaction } from '@core/services/credit.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-account-credit',
    standalone: true,
    imports: [DatePipe, DecimalPipe, BreadcrumbComponent],
    templateUrl: './account-credit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCreditComponent implements OnInit {
    readonly creditService = inject(CreditService);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Saldo de crédito' },
    ];

    history = signal<CreditTransaction[]>([]);
    loadingHistory = signal(false);
    currentPage = signal(0);
    totalPages = signal(0);

    ngOnInit(): void {
        this.creditService.loadBalance();
        this.loadHistory(0);
    }

    loadHistory(page: number): void {
        this.loadingHistory.set(true);
        this.creditService.getHistory(page).subscribe({
            next: (data) => {
                this.history.set(data.content ?? []);
                this.totalPages.set(data.totalPages ?? 0);
                this.currentPage.set(page);
                this.loadingHistory.set(false);
            },
            error: () => this.loadingHistory.set(false),
        });
    }

    typeColor(type: string): string {
        switch (type) {
            case 'RECARGA':
            case 'DEVOLUCION':
            case 'BONUS':
                return 'var(--color-success, #22c55e)';
            case 'USO':
                return 'var(--color-error)';
            default:
                return 'var(--color-text-muted)';
        }
    }

    typeSign(type: string): string {
        return ['RECARGA', 'DEVOLUCION', 'BONUS'].includes(type) ? '+' : '-';
    }
}
