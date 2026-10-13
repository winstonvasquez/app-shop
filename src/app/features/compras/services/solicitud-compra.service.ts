import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { longToSyntheticUuid } from '@core/utils/synthetic-uuid.util';
import { SolicitudCompra, SolicitudCompraPage } from '../models/solicitud-compra.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

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
        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            prioridad: filtros.prioridad,
            departamento: filtros.departamento,
            fechaRequeridaDesde: filtros.fechaRequeridaDesde,
            fechaRequeridaHasta: filtros.fechaRequeridaHasta,
            createdAtDesde: filtros.createdAtDesde,
            createdAtHasta: filtros.createdAtHasta,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
        });
        return params;
    }

    private toPage(raw: unknown, page: number, size: number): SolicitudCompraPage {
        return adaptSpringPage<SolicitudCompra>(raw, page, size);
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
     * Cabeceras de identidad para los endpoints que resuelven al solicitante.
     *
     * `X-Solicitante-Id` y `X-Company-Id` los declara el backend como `UUID`
     * (`SolicitudCompraController.findMisSolicitudes` / `crear`), pero el `userId` y el
     * `activeCompanyId` del token son `Long`. Mandar el número en crudo NO devuelve datos
     * vacíos: Spring no puede convertir `"14"` a UUID y responde **400**, que es lo que hacían
     * el listado "Mis Solicitudes" y el alta de solicitudes. La conversión es el UUID sintético
     * `new UUID(0, id)` que usa el resto del ERP.
     */
    private getSolicitanteHeaders(solicitanteId: number, solicitanteNombre?: string): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        const base: Record<string, string> = {
            'X-Solicitante-Id': longToSyntheticUuid(solicitanteId)
        };
        if (companyId !== undefined && companyId !== null) {
            base['X-Company-Id'] = longToSyntheticUuid(companyId);
        }
        if (solicitanteNombre !== undefined) {
            base['X-Solicitante-Nombre'] = solicitanteNombre;
        }
        return new HttpHeaders(base);
    }

    /**
     * Solicitudes del solicitante autenticado. Mismos filtros server-side que
     * `getSolicitudes`, salvo `departamento` (el endpoint /mis-solicitudes no lo acepta).
     */
    getMisSolicitudes(solicitanteId: number, filtros: SolicitudCompraFiltros = {}): Observable<SolicitudCompraPage> {
        const headers = this.getSolicitanteHeaders(solicitanteId);
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;
        const params = this.buildFiltrosParams(filtros, page, size);

        return this.http.get<unknown>(`${this.baseUrl}/mis-solicitudes`, { params, headers }).pipe(
            map((raw) => this.toPage(raw, page, size))
        );
    }

    createSolicitud(
        solicitud: Partial<SolicitudCompra>,
        solicitanteId: number,
        solicitanteNombre: string
    ): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(this.baseUrl, solicitud, {
            headers: this.getSolicitanteHeaders(solicitanteId, solicitanteNombre)
        });
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
