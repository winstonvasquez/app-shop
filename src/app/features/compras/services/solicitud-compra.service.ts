import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { SolicitudCompra, SolicitudCompraPage } from '../models/solicitud-compra.model';

/**
 * Filtros server-side del listado de solicitudes de compra. Todos opcionales.
 * Compartidos por `getSolicitudes` (todas las solicitudes de la empresa) y
 * `getMisSolicitudes` (scoped al solicitante autenticado — `departamento` no
 * aplica ahí porque el backend lo ignora en ese endpoint).
 */
export interface SolicitudCompraFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre código, justificación y nombre del solicitante. */
    q?: string;
    estado?: string;
    prioridad?: string;
    departamento?: string;
    /** yyyy-MM-dd */
    fechaRequeridaDesde?: string;
    /** yyyy-MM-dd */
    fechaRequeridaHasta?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class SolicitudCompraService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/solicitudes-compra`;

    private getCompanyHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    private buildFiltrosParams(filtros: SolicitudCompraFiltros, page: number, size: number): HttpParams {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.prioridad) params = params.set('prioridad', filtros.prioridad);
        if (filtros.departamento) params = params.set('departamento', filtros.departamento);
        if (filtros.fechaRequeridaDesde) params = params.set('fechaRequeridaDesde', filtros.fechaRequeridaDesde);
        if (filtros.fechaRequeridaHasta) params = params.set('fechaRequeridaHasta', filtros.fechaRequeridaHasta);
        if (filtros.createdAtDesde) params = params.set('createdAtDesde', filtros.createdAtDesde);
        if (filtros.createdAtHasta) params = params.set('createdAtHasta', filtros.createdAtHasta);
        if (filtros.sortField) params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        return params;
    }

    private toPage(raw: unknown, page: number, size: number): SolicitudCompraPage {
        const r = raw as Record<string, unknown>;
        const nested = r['page'] as Record<string, unknown> | undefined;
        return {
            content: (r['content'] as SolicitudCompra[]) ?? [],
            totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
            totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
            size: (r['size'] as number) ?? size,
            number: (r['number'] as number) ?? page,
        };
    }

    /**
     * Listado de TODAS las solicitudes de la empresa. Filtrado 100% server-side
     * (búsqueda, estado, prioridad, departamento y rangos de fecha) — la vista
     * nunca filtra la página cargada.
     */
    getSolicitudes(filtros: SolicitudCompraFiltros = {}): Observable<SolicitudCompraPage> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;
        const params = this.buildFiltrosParams(filtros, page, size);
        return this.http.get<unknown>(this.baseUrl, {
            params,
            headers: this.getCompanyHeaders()
        }).pipe(map((raw) => this.toPage(raw, page, size)));
    }

    getSolicitudById(id: string): Observable<SolicitudCompra> {
        return this.http.get<SolicitudCompra>(`${this.baseUrl}/${id}`, {
            headers: this.getCompanyHeaders()
        });
    }

    /**
     * Solicitudes del solicitante autenticado. Mismos filtros server-side que
     * `getSolicitudes`, salvo `departamento` (el endpoint /mis-solicitudes no lo acepta).
     */
    getMisSolicitudes(solicitanteId: string, filtros: SolicitudCompraFiltros = {}): Observable<SolicitudCompraPage> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Solicitante-Id': solicitanteId
        });
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;
        const params = this.buildFiltrosParams(filtros, page, size);

        return this.http.get<unknown>(`${this.baseUrl}/mis-solicitudes`, { params, headers }).pipe(
            map((raw) => this.toPage(raw, page, size))
        );
    }

    createSolicitud(
        solicitud: Partial<SolicitudCompra>,
        solicitanteId: string,
        solicitanteNombre: string
    ): Observable<SolicitudCompra> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Solicitante-Id': solicitanteId,
            'X-Solicitante-Nombre': solicitanteNombre
        });
        return this.http.post<SolicitudCompra>(this.baseUrl, solicitud, { headers });
    }

    updateSolicitud(id: string, solicitud: Partial<SolicitudCompra>): Observable<SolicitudCompra> {
        return this.http.put<SolicitudCompra>(`${this.baseUrl}/${id}`, solicitud, {
            headers: this.getCompanyHeaders()
        });
    }

    enviarSolicitud(id: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/enviar`, {}, {
            headers: this.getCompanyHeaders()
        });
    }

    aprobarSolicitud(id: string, aprobadorId: string): Observable<SolicitudCompra> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Aprobador-Id': aprobadorId
        });
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/aprobar`, {}, { headers });
    }

    rechazarSolicitud(id: string, motivo: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/rechazar`,
            { motivoRechazo: motivo },
            { headers: this.getCompanyHeaders() }
        );
    }

    cancelarSolicitud(id: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/cancelar`, {}, {
            headers: this.getCompanyHeaders()
        });
    }

    convertirAOrdenCompra(
        id: string,
        proveedorId: string,
        condicionPago: string,
        almacenDestino?: string
    ): Observable<unknown> {
        return this.http.post<unknown>(`${this.baseUrl}/${id}/convertir-oc`,
            { proveedorId, condicionPago, almacenDestino },
            { headers: this.getCompanyHeaders() }
        );
    }
}
