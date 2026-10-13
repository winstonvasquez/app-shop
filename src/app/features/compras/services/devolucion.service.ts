import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { CrearDevolucionRequest, Devolucion } from '../models/devolucion.model';
import { Page, adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del listado de devoluciones a proveedor. Todos opcionales. */
export interface DevolucionFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto: código, código de OC y razón social del proveedor. */
    q?: string;
    estado?: string;
    tipo?: string;
    motivo?: string;
    proveedorId?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/devoluciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    /**
     * Filtros del listado de devoluciones. TODO el filtrado ocurre en el backend
     * (`GET /purchases/api/devoluciones`); la vista nunca filtra la página cargada.
     */
    listar(filtros: DevolucionFiltros = {}): Observable<Page<Devolucion>> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            tipo: filtros.tipo,
            motivo: filtros.motivo,
            proveedorId: filtros.proveedorId,
            createdAtDesde: filtros.createdAtDesde,
            createdAtHasta: filtros.createdAtHasta,
        });

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => adaptSpringPage<Devolucion>(raw, page, size))
        );
    }

    getById(id: string): Observable<Devolucion> {
        return this.http.get<Devolucion>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    crear(request: CrearDevolucionRequest): Observable<Devolucion> {
        return this.http.post<Devolucion>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    enviar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/enviar`, {}, { headers: this.getHeaders() });
    }

    aceptar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/aceptar`, {}, { headers: this.getHeaders() });
    }

    completar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/completar`, {}, { headers: this.getHeaders() });
    }

    rechazar(id: string, motivo: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/rechazar`, { motivo }, { headers: this.getHeaders() });
    }
}
