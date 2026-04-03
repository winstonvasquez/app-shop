import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notification } from '@core/services/notification.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-account-notifications',
    standalone: true,
    imports: [BreadcrumbComponent, DatePipe],
    templateUrl: './account-notifications.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNotificationsComponent implements OnInit {
    private router = inject(Router);
    readonly notificationService = inject(NotificationService);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Notificaciones' }
    ];

    notifications = signal<Notification[]>([]);
    loading = signal(true);
    markingAll = signal(false);
    totalElements = signal(0);
    page = signal(0);
    readonly pageSize = 20;

    readonly isEmpty = computed(() => !this.loading() && this.notifications().length === 0);
    readonly hasMore = computed(() => this.notifications().length < this.totalElements());

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.notificationService.getPage(this.page(), this.pageSize).subscribe({
            next: (data) => {
                this.notifications.update(prev => [...prev, ...data.content]);
                this.totalElements.set(data.totalElements);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    loadMore(): void {
        this.page.update(p => p + 1);
        this.load();
    }

    markRead(notification: Notification): void {
        if (notification.read) return;
        this.notificationService.markRead(notification.id).subscribe({
            next: () => {
                this.notifications.update(list =>
                    list.map(n => n.id === notification.id ? { ...n, read: true } : n)
                );
                this.notificationService.decrementUnread();
                this.navigate(notification);
            }
        });
    }

    markAllRead(): void {
        this.markingAll.set(true);
        this.notificationService.markAllRead().subscribe({
            next: () => {
                this.notifications.update(list => list.map(n => ({ ...n, read: true })));
                this.notificationService.resetUnread();
                this.markingAll.set(false);
            },
            error: () => this.markingAll.set(false)
        });
    }

    remove(id: number, event: Event): void {
        event.stopPropagation();
        this.notificationService.delete(id).subscribe({
            next: () => {
                const was = this.notifications().find(n => n.id === id);
                this.notifications.update(list => list.filter(n => n.id !== id));
                this.totalElements.update(t => Math.max(0, t - 1));
                if (was && !was.read) this.notificationService.decrementUnread();
            }
        });
    }

    navigate(n: Notification): void {
        if (!n.referenceType) return;
        if (n.referenceType === 'PEDIDO' || n.referenceType === 'ORDER_STATUS_CHANGE') {
            this.router.navigate(['/account/orders', n.referenceId]);
        } else if (n.referenceType === 'REVIEW_REQUEST') {
            this.router.navigate(['/account/reviews']);
        } else if (n.referenceType === 'PROMO_OFFER') {
            this.router.navigate(['/account/coupons']);
        }
    }
}
