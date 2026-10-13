import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface Sucursal {
    id: number;
    companyId: number;
    nombre: string;
    direccion: string | null;
    ubigeo: string | null;
    telefono: string | null;
    serieBoleta: string | null;
    serieFactura: string | null;
    almacenId: number | null;
    activo: boolean;
}

export interface SucursalInput {
    companyId: number;
    nombre: string;
    direccion?: string;
    ubigeo?: string;
    telefono?: string;
    serieBoleta?: string;
    serieFactura?: string;
    almacenId?: number;
    /**
     * Estado activo/inactivo (baja lógica reversible). Si se omite en un update el
     * backend deja el estado actual sin tocar; en el alta, omitirlo equivale a activa.
     */
    activo?: boolean;
}

/** Filtros server-side del listado paginado de sucursales. Todos opcionales. */
export interface SucursalFiltros {
    page?: number;
    size?: number;
    q?: string;
    activo?: string;
    almacenId?: string;
    listaPreciosId?: string;
    ubigeo?: string;
    /** yyyy-MM-dd */
    fechaCreacionDesde?: string;
    /** yyyy-MM-dd */
    fechaCreacionHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class SucursalService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.pos}/sucursales`;

    /** Listado simple SIN paginar (solo sucursales activas) — usado por selects/POS. */
    list(companyId: number): Observable<Sucursal[]> {
        return this.http.get<Sucursal[]>(this.base, {
            params: new HttpParams().set('companyId', companyId.toString())
        });
    }

    /**
     * Listado paginado con búsqueda y filtros avanzados. TODO el filtrado ocurre en el backend
     * (`GET /pos/sucursales/paged`); la vista nunca filtra la página cargada.
     */
    listPaged(companyId: number, filtros: SucursalFiltros = {}): Observable<PageResponse<Sucursal>> {
        let params = toHttpParams({
            companyId,
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            search: filtros.q,
            activo: filtros.activo,
            almacenId: filtros.almacenId,
            listaPreciosId: filtros.listaPreciosId,
            ubigeo: filtros.ubigeo,
            fechaCreacionDesde: filtros.fechaCreacionDesde,
            fechaCreacionHasta: filtros.fechaCreacionHasta,
        });

        return this.http.get<PageResponse<Sucursal>>(`${this.base}/paged`, { params });
    }

    get(id: number): Observable<Sucursal> {
        return this.http.get<Sucursal>(`${this.base}/${id}`);
    }

    create(input: SucursalInput): Observable<Sucursal> {
        return this.http.post<Sucursal>(this.base, input);
    }

    update(id: number, input: SucursalInput): Observable<Sucursal> {
        return this.http.put<Sucursal>(`${this.base}/${id}`, input);
    }

    deactivate(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
