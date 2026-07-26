import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DemandForecast, ReorderSuggestion } from '../models/forecast.model';

/**
 * Consume ForecastingController (microshoplogistica). Solo lectura — companyId
 * se resuelve server-side vía TenantContext (JWT), no se envía desde el cliente.
 */
@Injectable({ providedIn: 'root' })
export class ForecastService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/forecasting`;

    /** Forecasts almacenados para un producto (todos los periodos/métodos ya generados). */
    getForecastsByProducto(productoId: string): Observable<DemandForecast[]> {
        return this.http.get<DemandForecast[]>(`${this.baseUrl}/product/${productoId}`);
    }

    /** Sugerencias de reorden — stock actual menor al forecast del próximo mes. */
    getReorderSuggestions(): Observable<ReorderSuggestion[]> {
        return this.http.get<ReorderSuggestion[]>(`${this.baseUrl}/reorder-suggestions`);
    }
}
