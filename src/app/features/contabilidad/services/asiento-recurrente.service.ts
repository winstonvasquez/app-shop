import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';

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

    /** Sin filtros — mantiene compatibilidad con llamadores existentes fuera del listado. */
    listar() {
        return this.http.get<AsientoRecurrente[]>(this.baseUrl);
    }

    /**
     * Listado paginado con filtros server-side (GET /asientos-recurrentes). La vista
     * nunca filtra la página cargada — todo el filtrado ocurre en el backend.
     */
    buscarPaginado(filtros: AsientoRecurrenteFiltros = {}): Observable<PageResponse<AsientoRecurrente>> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 20));

        if (filtros.frecuencia) params = params.set('frecuencia', filtros.frecuencia);
        if (filtros.activo !== undefined && filtros.activo !== null) params = params.set('activo', String(filtros.activo));
        if (filtros.nextExecutionDesde) params = params.set('nextExecutionDesde', filtros.nextExecutionDesde);
        if (filtros.nextExecutionHasta) params = params.set('nextExecutionHasta', filtros.nextExecutionHasta);
        if (filtros.lastExecutionDesde) params = params.set('lastExecutionDesde', filtros.lastExecutionDesde);
        if (filtros.lastExecutionHasta) params = params.set('lastExecutionHasta', filtros.lastExecutionHasta);
        if (filtros.vigenciaDesde) params = params.set('vigenciaDesde', filtros.vigenciaDesde);
        if (filtros.vigenciaHasta) params = params.set('vigenciaHasta', filtros.vigenciaHasta);
        if (filtros.q) params = params.set('q', filtros.q);

        return this.http.get<PageResponse<AsientoRecurrente>>(this.baseUrl, { params });
    }

    obtener(id: string) {
        return this.http.get<AsientoRecurrente>(`${this.baseUrl}/${id}`);
    }

    crear(request: AsientoRecurrenteRequest) {
        return this.http.post<AsientoRecurrente>(this.baseUrl, request);
    }

    ejecutarAhora(id: string) {
        return this.http.post<AsientoRecurrente>(`${this.baseUrl}/${id}/execute`, {});
    }

    desactivar(id: string) {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
