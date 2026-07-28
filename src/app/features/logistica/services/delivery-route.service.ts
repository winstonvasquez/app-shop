import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DeliveryRoute, DeliveryRoutePage, GenerateRouteBody, DeliveryRouteFiltros } from '../models/delivery-route.model';

@Injectable({ providedIn: 'root' })
export class DeliveryRouteService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/routes`;

    /**
     * Listado paginado con filtros avanzados opcionales (ronda de filtros 2026-07-27):
     * estado, conductor, almacén de salida, placa, búsqueda de texto y rangos de fecha
     * de ruta/inicio/finalización. Ver `DeliveryRouteController.listRoutes`.
     */
    list(filtros: DeliveryRouteFiltros = {}): Observable<DeliveryRoutePage> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 20));
        if (filtros.status) params = params.set('status', filtros.status);
        if (filtros.driverId) params = params.set('driverId', filtros.driverId);
        if (filtros.warehouseId) params = params.set('warehouseId', filtros.warehouseId);
        if (filtros.vehiclePlate) params = params.set('vehiclePlate', filtros.vehiclePlate);
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.routeDateDesde) params = params.set('routeDateDesde', filtros.routeDateDesde);
        if (filtros.routeDateHasta) params = params.set('routeDateHasta', filtros.routeDateHasta);
        if (filtros.startedAtDesde) params = params.set('startedAtDesde', filtros.startedAtDesde);
        if (filtros.startedAtHasta) params = params.set('startedAtHasta', filtros.startedAtHasta);
        if (filtros.completedAtDesde) params = params.set('completedAtDesde', filtros.completedAtDesde);
        if (filtros.completedAtHasta) params = params.set('completedAtHasta', filtros.completedAtHasta);
        return this.http.get<DeliveryRoutePage>(this.baseUrl, { params });
    }

    getById(id: string): Observable<DeliveryRoute> {
        return this.http.get<DeliveryRoute>(`${this.baseUrl}/${id}`);
    }

    /**
     * Genera una ruta optimizada (TSP nearest-neighbor) a partir de envíos PENDING_DISPATCH.
     * Ver `DeliveryRouteController.generateRoute` — @PostMapping("/generate"), NO en el baseUrl.
     */
    generate(body: GenerateRouteBody): Observable<DeliveryRoute> {
        return this.http.post<DeliveryRoute>(`${this.baseUrl}/generate`, body);
    }

    // Bug fix (2026-07-28): el backend expone /{id}/start como @PutMapping — un POST
    // aquí respondía 405 Method Not Allowed y dejaba la acción 'Iniciar' rota.
    start(id: string): Observable<DeliveryRoute> {
        return this.http.put<DeliveryRoute>(`${this.baseUrl}/${id}/start`, {});
    }

    complete(id: string): Observable<DeliveryRoute> {
        return this.http.post<DeliveryRoute>(`${this.baseUrl}/${id}/complete`, {});
    }
}
