import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

    getShipments(): Observable<ShipmentResponse[]> {
        return this.http.get<ShipmentResponse[]>(this.baseUrl);
    }

    trackShipment(trackingNumber: string): Observable<TrackingInfoResponse> {
        return this.http.get<TrackingInfoResponse>(`${this.trackingUrl}/${trackingNumber}`);
    }
}
