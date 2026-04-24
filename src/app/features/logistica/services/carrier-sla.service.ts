import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
    CarrierSla,
    CarrierPerformanceMetric,
    CarrierDashboard,
    CarrierRecommendation,
    CreateSlaBody,
    RecommendationParams
} from '../models/carrier-sla.model';

@Injectable({ providedIn: 'root' })
export class CarrierSlaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/carriers`;

    getSlas(carrierId: string): Observable<CarrierSla[]> {
        return this.http.get<CarrierSla[]>(`${this.baseUrl}/${carrierId}/sla`);
    }

    createSla(carrierId: string, body: CreateSlaBody): Observable<CarrierSla> {
        return this.http.post<CarrierSla>(`${this.baseUrl}/${carrierId}/sla`, body);
    }

    getPerformance(carrierId: string): Observable<CarrierPerformanceMetric[]> {
        return this.http.get<CarrierPerformanceMetric[]>(`${this.baseUrl}/${carrierId}/performance`);
    }

    getDashboard(carrierId: string): Observable<CarrierDashboard> {
        return this.http.get<CarrierDashboard>(`${this.baseUrl}/${carrierId}/dashboard`);
    }

    recommend(params: RecommendationParams): Observable<CarrierRecommendation[]> {
        let httpParams = new HttpParams();
        if (params.zone) httpParams = httpParams.set('zone', params.zone);
        if (params.weightKg != null) httpParams = httpParams.set('weightKg', String(params.weightKg));
        if (params.companyId) httpParams = httpParams.set('companyId', params.companyId);
        return this.http.get<CarrierRecommendation[]>(`${this.baseUrl}/recommend`, { params: httpParams });
    }
}
