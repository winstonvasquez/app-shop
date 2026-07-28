import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';

export interface DetalleRegla {
    codigoCuenta: string;
    campoOrigen: 'TOTAL' | 'BASE' | 'IGV' | 'ISC' | 'OTROS_CARGOS';
    movimientoTipo: 'DEBE' | 'HABER';
    porcentaje: number;
    orden: number;
}

export interface ReglaAsiento {
    id: string;
    transactionType: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
    detalles: DetalleRegla[];
    createdAt: string;
}

export interface ReglaAsientoRequest {
    transactionType: string;
    nombre: string;
    descripcion: string;
    detalles: DetalleRegla[];
}

export type TransactionType = 'VENTA' | 'COMPRA' | 'NOMINA' | 'TESORERIA' | 'INVENTARIO' | 'LOGISTICA';

/** Filtros server-side del listado de reglas de asiento automático. Todos opcionales. */
export interface ReglaAsientoFiltros {
    page?: number;
    size?: number;
    transactionType?: string;
    /** Estado activo/inactivo (columna boolean `active`). */
    active?: boolean;
    campoOrigen?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
    /** Búsqueda por texto sobre nombre/descripción/tipo. */
    search?: string;
}

@Injectable({ providedIn: 'root' })
export class ReglaAsientoService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/reglas-asiento`;

    /** Sin filtros — mantiene compatibilidad con llamadores existentes fuera del listado. */
    listar()                                          { return this.http.get<ReglaAsiento[]>(this.base); }
    obtener(id: string)                               { return this.http.get<ReglaAsiento>(`${this.base}/${id}`); }
    crear(req: ReglaAsientoRequest)                   { return this.http.post<ReglaAsiento>(this.base, req); }
    actualizar(id: string, req: ReglaAsientoRequest)  { return this.http.put<ReglaAsiento>(`${this.base}/${id}`, req); }
    desactivar(id: string)                            { return this.http.delete<void>(`${this.base}/${id}`); }
    activar(id: string)                               { return this.http.put<ReglaAsiento>(`${this.base}/${id}/activar`, {}); }

    /**
     * Listado paginado con filtros server-side (GET /reglas-asiento). La vista nunca
     * filtra la página cargada — todo el filtrado ocurre en el backend.
     */
    buscarPaginado(filtros: ReglaAsientoFiltros = {}): Observable<PageResponse<ReglaAsiento>> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 20));

        if (filtros.transactionType) params = params.set('transactionType', filtros.transactionType);
        if (filtros.active !== undefined && filtros.active !== null) params = params.set('active', String(filtros.active));
        if (filtros.campoOrigen) params = params.set('campoOrigen', filtros.campoOrigen);
        if (filtros.createdAtDesde) params = params.set('createdAtDesde', filtros.createdAtDesde);
        if (filtros.createdAtHasta) params = params.set('createdAtHasta', filtros.createdAtHasta);
        if (filtros.search) params = params.set('search', filtros.search);

        return this.http.get<PageResponse<ReglaAsiento>>(this.base, { params });
    }
}
