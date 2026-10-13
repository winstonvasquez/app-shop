import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface ShipmentResponse {
    id: string;
    trackingNumber: string;
    status: string;
    originAddress: string;
    destinationAddress: string;
    estimatedDelivery: string | null;
    carrier: unknown;
    createdAt: string;
}

/** Filtros server-side del listado de envíos (`GET /logistics/api/shipments`). Todos opcionales. */
export interface ShipmentFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre N° tracking, destinatario y dirección. */
    q?: string;
    status?: string;
    carrierId?: string;
    fulfillmentType?: string;
    /** yyyy-MM-dd */
    dispatchedAtDesde?: string;
    dispatchedAtHasta?: string;
    estimatedDeliveryDesde?: string;
    estimatedDeliveryHasta?: string;
    actualDeliveryDesde?: string;
    actualDeliveryHasta?: string;
    /** Rango sobre `fechaCreacion` — el backend lo expone como `registradoDesde/Hasta`. */
    registradoDesde?: string;
    registradoHasta?: string;
}

export interface TrackingEvent {
    timestamp: string;
    location: string;
    description: string;
    status: string;
}

export interface TrackingInfoResponse {
    trackingNumber: string;
    currentStatus: string;
    estimatedDelivery: string | null;
    events: TrackingEvent[];
}

@Injectable({ providedIn: 'root' })
export class ShipmentService {
    private http = inject(HttpClient);
    private baseUrl = '/logistics/api/shipments';
    private trackingUrl = '/logistics/api/tracking';

    /**
     * Listado PAGINADO de envíos, con filtros opcionales de estado, transportista,
     * fulfillment, búsqueda de texto y rangos de fecha. El backend
     * (`ShipmentController#getAllShipments`) pasó de `List` a `Page` en la ronda
     * 2026-07-27, así que la respuesta viene envuelta en `content` — no es un array plano.
     * TODO el filtrado ocurre en el backend; la vista nunca filtra la página cargada.
     */
    getShipments(filtros: ShipmentFiltros = {}): Observable<PageResponse<ShipmentResponse>> {
        let params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            q: filtros.q,
            status: filtros.status,
            carrierId: filtros.carrierId,
            fulfillmentType: filtros.fulfillmentType,
            dispatchedAtDesde: filtros.dispatchedAtDesde,
            dispatchedAtHasta: filtros.dispatchedAtHasta,
            estimatedDeliveryDesde: filtros.estimatedDeliveryDesde,
            estimatedDeliveryHasta: filtros.estimatedDeliveryHasta,
            actualDeliveryDesde: filtros.actualDeliveryDesde,
            actualDeliveryHasta: filtros.actualDeliveryHasta,
            registradoDesde: filtros.registradoDesde,
            registradoHasta: filtros.registradoHasta,
        });
        return this.http.get<PageResponse<ShipmentResponse>>(this.baseUrl, { params });
    }

    trackShipment(trackingNumber: string): Observable<TrackingInfoResponse> {
        return this.http.get<TrackingInfoResponse>(`${this.trackingUrl}/${trackingNumber}`);
    }
}
