import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
    PickingOrder,
    PickingPage,
    PickItemBody,
    CompletePickingBody
} from '../models/picking.model';

@Injectable({ providedIn: 'root' })
export class PickingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/picking`;

    getMyOrders(): Observable<PickingOrder[]> {
        return this.http.get<PickingOrder[]>(`${this.baseUrl}/my-orders`);
    }

    assignOrder(id: string): Observable<PickingOrder> {
        return this.http.post<PickingOrder>(`${this.baseUrl}/${id}/assign`, {});
    }

    startOrder(id: string): Observable<PickingOrder> {
        return this.http.post<PickingOrder>(`${this.baseUrl}/${id}/start`, {});
    }

    pickItem(orderId: string, itemId: string, body: PickItemBody): Observable<PickingOrder> {
        return this.http.post<PickingOrder>(`${this.baseUrl}/${orderId}/items/${itemId}/pick`, body);
    }

    completeOrder(id: string, body: CompletePickingBody): Observable<PickingOrder> {
        return this.http.post<PickingOrder>(`${this.baseUrl}/${id}/complete`, body);
    }
}
