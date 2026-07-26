import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CostAnalytics, CostByCarrier } from '../models/shipping-cost.model';

/**
 * Analytics de costos de envío (ShippingCostController: /api/analytics/shipping-costs).
 * `companyId` NO se envía como param: el backend lo resuelve de TenantContext (JWT).
 */
@Injectable({ providedIn: 'root' })
export class ShippingCostService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/analytics/shipping-costs`;

    getAnalytics(from: string, to: string): Observable<CostAnalytics> {
        const params = new HttpParams().set('from', from).set('to', to);
        return this.http.get<CostAnalytics>(this.baseUrl, { params });
    }

    getCostByCarrier(from: string, to: string): Observable<CostByCarrier[]> {
        const params = new HttpParams().set('from', from).set('to', to);
        return this.http.get<CostByCarrier[]>(`${this.baseUrl}/by-carrier`, { params });
    }
}
