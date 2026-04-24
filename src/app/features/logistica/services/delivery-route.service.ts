import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DeliveryRoute, DeliveryRoutePage, GenerateRouteBody } from '../models/delivery-route.model';

@Injectable({ providedIn: 'root' })
export class DeliveryRouteService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/routes`;

    list(page = 0, size = 20): Observable<DeliveryRoutePage> {
        const params = new HttpParams()
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<DeliveryRoutePage>(this.baseUrl, { params });
    }

    getById(id: string): Observable<DeliveryRoute> {
        return this.http.get<DeliveryRoute>(`${this.baseUrl}/${id}`);
    }

    generate(body: GenerateRouteBody): Observable<DeliveryRoute> {
        return this.http.post<DeliveryRoute>(this.baseUrl, body);
    }

    start(id: string): Observable<DeliveryRoute> {
        return this.http.post<DeliveryRoute>(`${this.baseUrl}/${id}/start`, {});
    }

    complete(id: string): Observable<DeliveryRoute> {
        return this.http.post<DeliveryRoute>(`${this.baseUrl}/${id}/complete`, {});
    }
}
