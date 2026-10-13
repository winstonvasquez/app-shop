import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { FinancialMovement } from '../models/tesoreria.model';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

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

/** Respuesta de GET .../movimientos/flujo-caja (montos serializados como número JSON). */
export interface FlujoCaja {
    tenantId: number;
    moneda: string;
    desde: string;
    hasta: string;
    flujoNeto: number;
    signo: 'POSITIVO' | 'NEGATIVO';
    totalIngresos: number;
    totalEgresos: number;
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
        let httpParams = toHttpParams({
            tenantId: this.tenantId,
            page: params?.page ?? 0,
            size: params?.size ?? 20,
            fechaDesde: params?.fechaDesde,
            fechaHasta: params?.fechaHasta,
            tipoMovimiento: params?.tipoMovimiento,
            origen: params?.origen,
            moneda: params?.moneda,
            origenId: params?.origenId,
            usuarioId: params?.usuarioId,
            q: params?.q,
        });

        return this.http.get<PageResponse<FinancialMovement>>(this.apiUrl, { params: httpParams });
    }

    /**
     * Totales del RANGO COMPLETO en UNA moneda (las transferencias no cuentan).
     * GET .../movimientos/flujo-caja?tenantId&desde&hasta&moneda
     */
    getFlujoCaja(fechaInicio: string, fechaFin: string, moneda: string): Observable<FlujoCaja> {
        const params = toHttpParams({
            tenantId: this.tenantId,
            desde: fechaInicio,
            hasta: fechaFin,
            moneda,
        });
        return this.http.get<FlujoCaja>(`${this.apiUrl}/flujo-caja`, { params });
    }

    registerMovement(movement: FinancialMovementRequest): Observable<FinancialMovement> {
        return this.http.post<FinancialMovement>(this.apiUrl, movement);
    }
}
