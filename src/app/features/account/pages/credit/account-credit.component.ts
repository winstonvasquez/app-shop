import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { CreditService, CreditTransaction } from '@core/services/credit.service';
import { DsAccountShellComponent, DsButtonComponent } from '@shared/ui/ds';

@Component({
    selector: 'app-account-credit',
    standalone: true,
    imports: [DatePipe, DecimalPipe, LucideAngularModule, DsAccountShellComponent, DsButtonComponent],
    templateUrl: './account-credit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCreditComponent implements OnInit {
    private authService = inject(AuthService);
    readonly creditService = inject(CreditService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

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
