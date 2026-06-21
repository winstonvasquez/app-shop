import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfirmDeliveryBody {
    receivedBy: string;
    receiverIdType?: string;
    receiverIdNumber?: string;
    signatureUrl?: string;
    photoUrl?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
}

export interface DeliveryConfirmation {
    id: string;
    shipmentId: string;
    deliveryDate: string;
    receivedBy: string;
    receiverIdType: string | null;
    receiverIdNumber: string | null;
    signatureUrl: string | null;
    photoUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    createdAt: string;
}

/** Confirmaciones de entrega (proof of delivery), con coordenadas GPS opcionales. */
@Injectable({ providedIn: 'root' })
export class DeliveryService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/deliveries';

    confirmDelivery(shipmentId: string, body: ConfirmDeliveryBody): Observable<DeliveryConfirmation> {
        return this.http.post<DeliveryConfirmation>(`${this.baseUrl}/confirm/${shipmentId}`, body);
    }

    getConfirmation(shipmentId: string): Observable<DeliveryConfirmation> {
        return this.http.get<DeliveryConfirmation>(`${this.baseUrl}/shipment/${shipmentId}`);
    }
}
