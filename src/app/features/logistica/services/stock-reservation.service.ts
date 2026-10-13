import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { StockReservation, ReserveBody, StockReservationFiltros } from '../models/stock-reservation.model';
import { toHttpParams } from '@core/utils/http-params.util';

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
        let params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            status: filtros.status,
            productoId: filtros.productoId,
            inventarioId: filtros.inventarioId,
            q: filtros.q,
            expiresAtDesde: filtros.expiresAtDesde,
            expiresAtHasta: filtros.expiresAtHasta,
            releasedAtDesde: filtros.releasedAtDesde,
            releasedAtHasta: filtros.releasedAtHasta,
            consumedAtDesde: filtros.consumedAtDesde,
            consumedAtHasta: filtros.consumedAtHasta,
        });
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
