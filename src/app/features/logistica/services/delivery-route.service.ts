import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DeliveryRoute, DeliveryRoutePage, GenerateRouteBody, DeliveryRouteFiltros } from '../models/delivery-route.model';
import { toHttpParams } from '@core/utils/http-params.util';

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
        let params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            status: filtros.status,
            driverId: filtros.driverId,
            warehouseId: filtros.warehouseId,
            vehiclePlate: filtros.vehiclePlate,
            q: filtros.q,
            routeDateDesde: filtros.routeDateDesde,
            routeDateHasta: filtros.routeDateHasta,
            startedAtDesde: filtros.startedAtDesde,
            startedAtHasta: filtros.startedAtHasta,
            completedAtDesde: filtros.completedAtDesde,
            completedAtHasta: filtros.completedAtHasta,
        });
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
