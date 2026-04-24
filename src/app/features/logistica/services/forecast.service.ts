import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DemandForecast, ReorderSuggestion, ForecastMethod } from '../models/forecast.model';

@Injectable({ providedIn: 'root' })
export class ForecastService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/forecasting`;

    getForecast(productoId: string, method: ForecastMethod, periods = 6): Observable<DemandForecast> {
        const params = new HttpParams()
            .set('productoId', productoId)
            .set('method', method)
            .set('periods', String(periods));
        return this.http.get<DemandForecast>(`${this.baseUrl}/forecast`, { params });
    }

    getReorderSuggestions(companyId: string): Observable<ReorderSuggestion[]> {
        const params = new HttpParams().set('companyId', companyId);
        return this.http.get<ReorderSuggestion[]>(`${this.baseUrl}/reorder-suggestions`, { params });
    }
}
