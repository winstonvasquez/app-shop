import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationLogisticaService } from '../../services/notification-logistica.service';
import { LogisticsNotification } from '../../models/notification.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-notifications-logistica',
    standalone: true,
    imports: [DatePipe, ButtonComponent],
    templateUrl: './notifications.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
    private readonly notifService = inject(NotificationLogisticaService);

    notifications = signal<LogisticsNotification[]>([]);
    loading = signal(false);
    markingId = signal<string | null>(null);
    markingAll = signal(false);
    error = signal<string | null>(null);

    unreadCount = computed(() =>
        this.notifications().filter(n => !n.read).length
    );

    ngOnInit(): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        this.loading.set(true);
        this.notifService.getUnread().subscribe({
            next: (list) => {
                this.notifications.set(list);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar notificaciones');
                this.loading.set(false);
            }
        });
    }

    markRead(id: string): void {
        this.markingId.set(id);
        this.notifService.markRead(id).subscribe({
            next: () => {
                this.notifications.update(list =>
                    list.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
                );
                this.markingId.set(null);
            },
            error: () => this.markingId.set(null)
        });
    }

    markAllRead(): void {
        this.markingAll.set(true);
        this.notifService.markAllRead().subscribe({
            next: () => {
                this.notifications.update(list =>
                    list.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
                );
                this.markingAll.set(false);
            },
            error: () => this.markingAll.set(false)
        });
    }

    typeClass(type: string): string {
        switch (type) {
            case 'PICKING_ASSIGNED': return 'bg-info/10 text-info';
            case 'STOCK_LOW': return 'bg-error/10 text-error';
            case 'SHIPMENT_DELAYED': return 'bg-orange-100 text-orange-700';
            case 'DELIVERY_COMPLETED': return 'bg-success/10 text-success';
            default: return 'bg-gray-100 text-gray-600';
        }
    }
}
