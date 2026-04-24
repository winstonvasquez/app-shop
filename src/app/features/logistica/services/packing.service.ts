import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PackingOrder } from '../models/packing.model';

@Injectable({ providedIn: 'root' })
export class PackingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/packing`;

    getMyOrders(): Observable<PackingOrder[]> {
        return this.http.get<PackingOrder[]>(`${this.baseUrl}/my-orders`);
    }

    assignOrder(id: string): Observable<PackingOrder> {
        return this.http.post<PackingOrder>(`${this.baseUrl}/${id}/assign`, {});
    }

    completeOrder(id: string): Observable<PackingOrder> {
        return this.http.post<PackingOrder>(`${this.baseUrl}/${id}/complete`, {});
    }
}
