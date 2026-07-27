import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from '@core/models/pagination.model';

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
     * Listado PAGINADO de envíos. El backend (`ShipmentController#getAllShipments`)
     * pasó de `List` a `Page` en la ronda 2026-07-27, así que la respuesta viene
     * envuelta en `content` — no es un array plano.
     */
    getShipments(page = 0, size = 20): Observable<PageResponse<ShipmentResponse>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<PageResponse<ShipmentResponse>>(this.baseUrl, { params });
    }

    trackShipment(trackingNumber: string): Observable<TrackingInfoResponse> {
        return this.http.get<TrackingInfoResponse>(`${this.trackingUrl}/${trackingNumber}`);
    }
}
