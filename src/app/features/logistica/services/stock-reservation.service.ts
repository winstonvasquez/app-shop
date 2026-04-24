import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { StockReservation, ReserveBody, ReleaseBody } from '../models/stock-reservation.model';

@Injectable({ providedIn: 'root' })
export class StockReservationService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/stock-reservations`;

    reserve(body: ReserveBody): Observable<StockReservation> {
        return this.http.post<StockReservation>(this.baseUrl, body);
    }

    release(orderId: string, reason: string): Observable<void> {
        const body: ReleaseBody = { reason };
        return this.http.post<void>(`${this.baseUrl}/release/${orderId}`, body);
    }

    consume(orderId: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/consume/${orderId}`, {});
    }

    getByOrder(orderId: string): Observable<StockReservation> {
        return this.http.get<StockReservation>(`${this.baseUrl}/by-order/${orderId}`);
    }
}
