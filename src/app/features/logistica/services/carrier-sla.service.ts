import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
    CarrierSla,
    CarrierSlaRequest,
    CarrierPerformanceMetric,
    CarrierDashboard,
    CarrierRecommendation,
    RecommendationParams
} from '../models/carrier-sla.model';

/**
 * Servicio de SLA/performance/recomendación de transportistas.
 *
 * CORRECCIÓN ronda 2 (2026-07-26): la versión anterior enviaba/esperaba un
 * contrato que no coincidía con el backend real (paths de performance/
 * dashboard/recommend correctos, pero shapes y query params inventados;
 * faltaban updateSla/deleteSla). Ver CarrierSlaController + CarrierController
 * en microshoplogistica para el contrato verificado.
 */
@Injectable({ providedIn: 'root' })
export class CarrierSlaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/carriers`;

    // ── SLA CRUD (CarrierSlaController: /api/carriers/{carrierId}/sla) ──────
    getSlas(carrierId: string): Observable<CarrierSla[]> {
        return this.http.get<CarrierSla[]>(`${this.baseUrl}/${carrierId}/sla`);
    }

    createSla(carrierId: string, body: CarrierSlaRequest): Observable<CarrierSla> {
        return this.http.post<CarrierSla>(`${this.baseUrl}/${carrierId}/sla`, body);
    }

    updateSla(carrierId: string, slaId: string, body: CarrierSlaRequest): Observable<CarrierSla> {
        return this.http.put<CarrierSla>(`${this.baseUrl}/${carrierId}/sla/${slaId}`, body);
    }

    deleteSla(carrierId: string, slaId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${carrierId}/sla/${slaId}`);
    }

    // ── Performance / Dashboard (CarrierController) ─────────────────────────
    getPerformance(carrierId: string): Observable<CarrierPerformanceMetric[]> {
        return this.http.get<CarrierPerformanceMetric[]>(`${this.baseUrl}/${carrierId}/performance`);
    }

    getDashboard(carrierId: string): Observable<CarrierDashboard> {
        return this.http.get<CarrierDashboard>(`${this.baseUrl}/${carrierId}/dashboard`);
    }

    /**
     * Recomendación de transportista óptimo para un destino.
     * `companyId` NO se envía como param: el backend lo resuelve de
     * TenantContext (JWT) — ver CarrierController.recommend().
     */
    recommend(params: RecommendationParams): Observable<CarrierRecommendation[]> {
        let httpParams = new HttpParams()
            .set('departamento', params.departamento)
            .set('weight', String(params.weight));
        if (params.provincia) httpParams = httpParams.set('provincia', params.provincia);
        if (params.serviceType) httpParams = httpParams.set('serviceType', params.serviceType);
        return this.http.get<CarrierRecommendation[]>(`${this.baseUrl}/recommend`, { params: httpParams });
    }
}
