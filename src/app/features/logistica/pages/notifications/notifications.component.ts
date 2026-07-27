import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
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
export class NotificationsComponent implements OnInit, OnDestroy {
    private readonly notifService = inject(NotificationLogisticaService);

    notifications = signal<LogisticsNotification[]>([]);
    loading = signal(false);
    markingId = signal<string | null>(null);
    markingAll = signal(false);
    error = signal<string | null>(null);

    unreadCount = computed(() =>
        this.notifications().filter(n => !n.read).length
    );

    /** EventSource activo del stream SSE (null si no hay conexion abierta) */
    private eventSource: EventSource | null = null;
    /** Subscription del Observable que entrega el EventSource (una emision por conexion) */
    private streamSub: Subscription | null = null;
    /** Evita reintentos infinitos: solo UN reintento tras un error/expiracion de ticket */
    private reconnectIntentado = false;

    ngOnInit(): void {
        this.loadNotifications();
        this.connectStream();
    }

    ngOnDestroy(): void {
        this.closeStream();
    }

    /**
     * Abre el stream SSE de notificaciones en tiempo real como COMPLEMENTO del GET inicial
     * de no-leidas (loadNotifications) -- no lo reemplaza. Cada notificacion que llega por
     * el stream se agrega a la lista ya cargada (deduplicando por id) y el contador de
     * no-leidas se actualiza solo via el computed().
     */
    private connectStream(): void {
        this.streamSub = this.notifService.getStream().subscribe({
            next: (es) => {
                this.eventSource = es;
                es.addEventListener('notification', (event: MessageEvent) => {
                    this.handleIncomingNotification(event.data);
                });
                es.onerror = () => {
                    this.closeStream();
                    // Reintento unico (ej. el ticket expiro por tardanza en abrir la conexion)
                    if (!this.reconnectIntentado) {
                        this.reconnectIntentado = true;
                        this.connectStream();
                    }
                };
            },
            error: () => {
                // No se pudo obtener el ticket inicial (ej. sin JWT de usuario); el stream
                // queda deshabilitado pero loadNotifications()/markRead() siguen funcionando
            }
        });
    }

    private handleIncomingNotification(rawData: string): void {
        try {
            const incoming = JSON.parse(rawData) as LogisticsNotification;
            this.notifications.update(list =>
                list.some(n => n.id === incoming.id) ? list : [incoming, ...list]
            );
        } catch {
            // Payload SSE invalido/no-JSON: se ignora silenciosamente
        }
    }

    private closeStream(): void {
        this.eventSource?.close();
        this.eventSource = null;
        this.streamSub?.unsubscribe();
        this.streamSub = null;
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
            case 'SHIPMENT_DELAYED': return 'bg-warning/10 text-warning';
            case 'DELIVERY_COMPLETED': return 'bg-success/10 text-success';
            default: return 'bg-gray-100 text-gray-600';
        }
    }
}
