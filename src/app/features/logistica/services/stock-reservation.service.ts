import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { StockReservation, ReserveBody } from '../models/stock-reservation.model';

@Injectable({ providedIn: 'root' })
export class StockReservationService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/stock-reservations`;

    /** Backend real: POST / → 201 con List<StockReservationResponse> (una fila por producto). */
    reserve(body: ReserveBody): Observable<StockReservation[]> {
        return this.http.post<StockReservation[]>(this.baseUrl, body);
    }

    release(orderId: string, reason: string): Observable<void> {
        // Backend real: DELETE /order/{orderId}?reason=... (StockReservationController.liberar)
        return this.http.delete<void>(`${this.baseUrl}/order/${orderId}`, {
            params: { reason },
        });
    }

    consume(orderId: string): Observable<void> {
        // Backend real: PUT /order/{orderId}/consume (StockReservationController.consumir)
        return this.http.put<void>(`${this.baseUrl}/order/${orderId}/consume`, {});
    }

    /**
     * Backend real: GET /order/{orderId} (StockReservationController.obtenerPorOrden) →
     * List<StockReservationResponse>. Devuelve TODAS las reservas del pedido (una por
     * producto), en cualquier estado. Fix 2026-07-26: antes se tipaba como objeto
     * singular y el componente reventaba al leer `res.items.length` sobre un array.
     */
    getByOrder(orderId: string): Observable<StockReservation[]> {
        return this.http.get<StockReservation[]>(`${this.baseUrl}/order/${orderId}`);
    }
}
