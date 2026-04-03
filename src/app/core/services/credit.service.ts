import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface CreditTransaction {
    id: number;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
}

export interface CreditBalance {
    balance: number;
    currency: string;
    recentTransactions: CreditTransaction[];
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
}

@Injectable({ providedIn: 'root' })
export class CreditService {
    private http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.users}/api/users/me/credit`;

    readonly balance = signal<CreditBalance | null>(null);

    loadBalance(): void {
        this.http.get<CreditBalance>(this.base).subscribe({
            next: (data) => this.balance.set(data),
            error: () => this.balance.set(null),
        });
    }

    getHistory(page = 0, size = 20) {
        return this.http.get<PageResponse<CreditTransaction>>(
            `${this.base}/history`, { params: { page, size } }
        );
    }
}
