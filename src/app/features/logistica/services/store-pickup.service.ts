import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { StorePickup, StorePickupPage, CreateStorePickupBody, VerifyPickupBody } from '../models/store-pickup.model';

@Injectable({ providedIn: 'root' })
export class StorePickupService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/store-pickups`;

    list(page = 0, size = 20): Observable<StorePickupPage> {
        const params = new HttpParams()
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<StorePickupPage>(this.baseUrl, { params });
    }

    getById(id: string): Observable<StorePickup> {
        return this.http.get<StorePickup>(`${this.baseUrl}/${id}`);
    }

    create(body: CreateStorePickupBody): Observable<StorePickup> {
        return this.http.post<StorePickup>(this.baseUrl, body);
    }

    markReady(id: string): Observable<StorePickup> {
        return this.http.post<StorePickup>(`${this.baseUrl}/${id}/ready`, {});
    }

    verify(body: VerifyPickupBody): Observable<StorePickup> {
        return this.http.post<StorePickup>(`${this.baseUrl}/verify`, body);
    }

    cancel(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/cancel`, {});
    }
}
