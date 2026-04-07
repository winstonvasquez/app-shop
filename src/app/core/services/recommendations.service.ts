import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ProductResponse } from '@core/models/product.model';

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/recomendaciones`;

    getSimilares(productoId: number, limite = 8): Observable<ProductResponse[]> {
        return this.http.get<ProductResponse[]>(`${this.baseUrl}/similares/${productoId}`, {
            params: { limite: limite.toString() }
        }).pipe(catchError(() => EMPTY));
    }

    getParaTi(usuarioId?: number, limite = 8): Observable<ProductResponse[]> {
        const params: Record<string, string> = { limite: limite.toString() };
        if (usuarioId) params['usuarioId'] = usuarioId.toString();
        return this.http.get<ProductResponse[]>(`${this.baseUrl}/para-ti`, { params })
            .pipe(catchError(() => EMPTY));
    }

    trackVisualizacion(productoId: number, usuarioId?: number): void {
        const params: Record<string, string> = {};
        if (usuarioId) params['usuarioId'] = usuarioId.toString();
        this.http.post(`${this.baseUrl}/historial/${productoId}`, null, { params })
            .pipe(catchError(() => EMPTY))
            .subscribe();
    }
}
