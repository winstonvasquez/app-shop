import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface RecurringLineItem {
    accountCode: string;
    movementType: 'DEBE' | 'HABER';
    amount: number;
}

export interface AsientoRecurrente {
    id: string;
    name: string;
    description: string;
    frequency: 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
    executionDay: number;
    startDate: string;
    endDate: string | null;
    nextExecution: string;
    lastExecution: string | null;
    active: boolean;
    templateGloss: string;
    templateLines: RecurringLineItem[];
    createdAt: string;
}

export interface AsientoRecurrenteRequest {
    name: string;
    description: string;
    frequency: string;
    executionDay: number;
    startDate: string;
    endDate: string | null;
    templateGloss: string;
    templateLines: RecurringLineItem[];
}

/** Filtros server-side del listado de asientos recurrentes. Todos opcionales. */
export interface AsientoRecurrenteFiltros {
    page?: number;
    size?: number;
    frecuencia?: string;
    /** Estado activo/inactivo (columna boolean `active`). */
    activo?: boolean;
    /** yyyy-MM-dd */
    nextExecutionDesde?: string;
    /** yyyy-MM-dd */
    nextExecutionHasta?: string;
    /** yyyy-MM-dd */
    lastExecutionDesde?: string;
    /** yyyy-MM-dd */
    lastExecutionHasta?: string;
    /** yyyy-MM-dd — vigencia de la plantilla (startDate/endDate) */
    vigenciaDesde?: string;
    /** yyyy-MM-dd */
    vigenciaHasta?: string;
    /** Búsqueda por texto sobre nombre/descripción/glosa. */
    q?: string;
}

@Injectable({ providedIn: 'root' })
export class AsientoRecurrenteService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/asientos-recurrentes`;

    /**
     * Listado paginado con filtros server-side (GET /asientos-recurrentes). La vista
     * nunca filtra la página cargada — todo el filtrado ocurre en el backend.
     */
    buscarPaginado(filtros: AsientoRecurrenteFiltros = {}): Observable<PageResponse<AsientoRecurrente>> {
        let params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            frecuencia: filtros.frecuencia,
            activo: filtros.activo,
            nextExecutionDesde: filtros.nextExecutionDesde,
            nextExecutionHasta: filtros.nextExecutionHasta,
            lastExecutionDesde: filtros.lastExecutionDesde,
            lastExecutionHasta: filtros.lastExecutionHasta,
            vigenciaDesde: filtros.vigenciaDesde,
            vigenciaHasta: filtros.vigenciaHasta,
            q: filtros.q,
        });

        return this.http.get<PageResponse<AsientoRecurrente>>(this.baseUrl, { params });
    }

    obtener(id: string) {
        return this.http.get<AsientoRecurrente>(`${this.baseUrl}/${id}`);
    }

    crear(request: AsientoRecurrenteRequest) {
        return this.http.post<AsientoRecurrente>(this.baseUrl, request);
    }

    actualizar(id: string, request: AsientoRecurrenteRequest) {
        return this.http.put<AsientoRecurrente>(`${this.baseUrl}/${id}`, request);
    }

    ejecutarAhora(id: string) {
        return this.http.post<AsientoRecurrente>(`${this.baseUrl}/${id}/execute`, {});
    }

    activar(id: string) {
        return this.http.put<AsientoRecurrente>(`${this.baseUrl}/${id}/activar`, {});
    }

    desactivar(id: string) {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
