import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { interval, switchMap, catchError, of, startWith, filter } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';

export interface Notification {
    id: number;
    type: string;
    title: string;
    body: string | null;
    referenceId: number | null;
    referenceType: string | null;
    read: boolean;
    createdAt: string;
}

export interface NotificationPage {
    content: Notification[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly base = `${environment.apiUrls.users}/api/users/me/notifications`;

    readonly unreadCount = signal<number>(0);

    startPolling(): void {
        interval(60_000).pipe(
            startWith(0),
            filter(() => this.authService.isAuthenticated()),
            switchMap(() =>
                this.http.get<{ count: number }>(`${this.base}/unread-count`).pipe(
                    catchError(() => of({ count: 0 }))
                )
            ),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(({ count }) => this.unreadCount.set(count));
    }

    getPage(page = 0, size = 20) {
        return this.http.get<NotificationPage>(this.base, { params: { page, size } });
    }

    markRead(id: number) {
        return this.http.patch<void>(`${this.base}/${id}/read`, {});
    }

    markAllRead() {
        return this.http.patch<void>(`${this.base}/read-all`, {});
    }

    delete(id: number) {
        return this.http.delete<void>(`${this.base}/${id}`);
    }

    decrementUnread(): void {
        this.unreadCount.update(n => Math.max(0, n - 1));
    }

    resetUnread(): void {
        this.unreadCount.set(0);
    }
}
