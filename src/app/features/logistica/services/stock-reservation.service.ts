import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { StockReservation, ReserveBody, StockReservationFiltros } from '../models/stock-reservation.model';

@Injectable({ providedIn: 'root' })
export class StockReservationService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/stock-reservations`;

    /**
     * Listado paginado con filtros avanzados opcionales (endpoint NUEVO, ronda de filtros
     * 2026-07-27): estado, producto, almacén/inventario, búsqueda de texto y rangos de
     * fecha de expiración/liberación/consumo. Ver `StockReservationController.listar`.
     */
    listar(filtros: StockReservationFiltros = {}): Observable<PageResponse<StockReservation>> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 20));
        if (filtros.status) params = params.set('status', filtros.status);
        if (filtros.productoId) params = params.set('productoId', filtros.productoId);
        if (filtros.inventarioId) params = params.set('inventarioId', filtros.inventarioId);
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.expiresAtDesde) params = params.set('expiresAtDesde', filtros.expiresAtDesde);
        if (filtros.expiresAtHasta) params = params.set('expiresAtHasta', filtros.expiresAtHasta);
        if (filtros.releasedAtDesde) params = params.set('releasedAtDesde', filtros.releasedAtDesde);
        if (filtros.releasedAtHasta) params = params.set('releasedAtHasta', filtros.releasedAtHasta);
        if (filtros.consumedAtDesde) params = params.set('consumedAtDesde', filtros.consumedAtDesde);
        if (filtros.consumedAtHasta) params = params.set('consumedAtHasta', filtros.consumedAtHasta);
        return this.http.get<PageResponse<StockReservation>>(this.baseUrl, { params });
    }

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
