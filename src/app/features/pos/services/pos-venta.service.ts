import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { VentaPosRequest, VentaPosResponse, PageResponse } from '../models/venta-pos.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PosVentaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos;

    procesarVenta(request: VentaPosRequest): Observable<VentaPosResponse> {
        return this.http.post<VentaPosResponse>(`${this.baseUrl}/ventas`, request);
    }

    anularVenta(ventaId: number): Observable<VentaPosResponse> {
        return this.http.post<VentaPosResponse>(`${this.baseUrl}/ventas/${ventaId}/anular`, {});
    }

    getRecibo(ventaId: number): Observable<VentaPosResponse> {
        return this.http.get<VentaPosResponse>(`${this.baseUrl}/ventas/${ventaId}/recibo`);
    }

    getHistorial(turnoId: number, page = 0, size = 20): Observable<PageResponse<VentaPosResponse>> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<PageResponse<VentaPosResponse>>(
            `${this.baseUrl}/turno/${turnoId}/historial`,
            { params }
        );
    }
}
