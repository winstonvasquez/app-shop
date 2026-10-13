import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { ProductResponse } from '@core/models/product.model';
import { toHttpParams } from '@core/utils/http-params.util';

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
        let params = toHttpParams({
            limite,
            usuarioId,
        });
        return this.http.get<ProductResponse[]>(`${this.baseUrl}/para-ti`, { params })
            .pipe(catchError(() => EMPTY));
    }

    trackVisualizacion(productoId: number, usuarioId?: number): void {
        let params = toHttpParams({
            usuarioId,
        });
        this.http.post(`${this.baseUrl}/historial/${productoId}`, null, { params })
            .pipe(catchError(() => EMPTY))
            .subscribe();
    }
}
