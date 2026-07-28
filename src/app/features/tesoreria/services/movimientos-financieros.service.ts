import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { FinancialMovement } from '../models/tesoreria.model';
import { PageResponse } from '@core/models/pagination.model';

export interface FinancialMovementRequest {
    tenantId: number;
    tipoMovimiento: string;
    origen: string;
    monto: number;
    moneda: string;
    fecha: string;
    descripcion: string;
    /** Nombre EXACTO del campo en FinancialMovementRequestDto (backend): origenId, no cajaId. */
    origenId?: number;
}

@Injectable({
    providedIn: 'root'
})
export class MovimientosFinancierosService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrls.treasury}/api/tesoreria/movimientos`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    /**
     * Lista paginada de movimientos. Nombres de query params EXACTOS a
     * FinancialMovementController#getAll (backend): tenantId, tipoMovimiento,
     * origen, fechaDesde, fechaHasta, page, size.
     */
    /**
     * Filtros del listado de movimientos. TODO el filtrado ocurre en el backend
     * (`GET /treasury/api/tesoreria/movimientos`); la vista nunca filtra la página cargada.
     */
    getAll(params?: {
        fechaDesde?: string;
        fechaHasta?: string;
        tipoMovimiento?: string;
        origen?: string;
        moneda?: string;
        origenId?: string;
        usuarioId?: string;
        /** Búsqueda por texto sobre descripción/referencia. */
        q?: string;
        page?: number;
        size?: number;
    }): Observable<PageResponse<FinancialMovement>> {
        let httpParams = new HttpParams().set('tenantId', this.tenantId);

        httpParams = httpParams
            .set('page', (params?.page ?? 0).toString())
            .set('size', (params?.size ?? 20).toString());

        if (params?.fechaDesde) httpParams = httpParams.set('fechaDesde', params.fechaDesde);
        if (params?.fechaHasta) httpParams = httpParams.set('fechaHasta', params.fechaHasta);
        if (params?.tipoMovimiento) httpParams = httpParams.set('tipoMovimiento', params.tipoMovimiento);
        if (params?.origen) httpParams = httpParams.set('origen', params.origen);
        if (params?.moneda) httpParams = httpParams.set('moneda', params.moneda);
        if (params?.origenId) httpParams = httpParams.set('origenId', params.origenId);
        if (params?.usuarioId) httpParams = httpParams.set('usuarioId', params.usuarioId);
        if (params?.q) httpParams = httpParams.set('q', params.q);

        return this.http.get<PageResponse<FinancialMovement>>(this.apiUrl, { params: httpParams });
    }

    getFlujoCaja(fechaInicio: string, fechaFin: string): Observable<number> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('desde', fechaInicio)
            .set('hasta', fechaFin);
        // El backend retorna { flujoNeto, desde, hasta, signo, tenantId }; extraemos el número.
        return this.http.get<{ flujoNeto: number }>(`${this.apiUrl}/flujo-caja`, { params })
            .pipe(map(r => Number(r?.flujoNeto ?? 0)));
    }

    registerMovement(movement: FinancialMovementRequest): Observable<FinancialMovement> {
        return this.http.post<FinancialMovement>(this.apiUrl, movement);
    }
}
