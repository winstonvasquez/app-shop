import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { LogisticsNotification, UnreadCountResponse } from '../models/notification.model';

interface StreamTicketResponse {
    ticket: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationLogisticaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/notifications`;

    getUnread(): Observable<LogisticsNotification[]> {
        return this.http.get<LogisticsNotification[]>(`${this.baseUrl}/unread`);
    }

    getUnreadCount(): Observable<UnreadCountResponse> {
        return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread/count`);
    }

    markRead(id: string): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${id}/read`, {});
    }

    markAllRead(): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/read-all`, {});
    }

    /**
     * EventSource nativo del browser no puede enviar el header Authorization, así que el
     * stream se abre en dos pasos: 1) pedir un ticket de un solo uso vía POST autenticado
     * normal (el interceptor HTTP inyecta el JWT), 2) abrir el EventSource pasando el
     * ticket como query param. El backend valida/invalida el ticket en GET /stream.
     */
    getStream(): Observable<EventSource> {
        return this.http.post<StreamTicketResponse>(`${this.baseUrl}/stream-ticket`, {}).pipe(
            map(({ ticket }) => new EventSource(`${this.baseUrl}/stream?ticket=${ticket}`))
        );
    }
}
