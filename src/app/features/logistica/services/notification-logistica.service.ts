import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LogisticsNotification, UnreadCountResponse } from '../models/notification.model';

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
        return this.http.post<void>(`${this.baseUrl}/${id}/read`, {});
    }

    markAllRead(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/read-all`, {});
    }

    getStream(): EventSource {
        return new EventSource(`${this.baseUrl}/stream`);
    }
}
