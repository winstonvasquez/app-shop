import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import {
    ActualizarCotizacionRequest,
    ComparativaDto,
    CotizacionDetalleDto,
    CotizacionResumen,
    CotizacionesPage,
    CrearCotizacionRequest,
    RegistrarRespuestaRequest,
} from '../models/cotizacion.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

/** Filtros server-side del listado de cotizaciones. Todos opcionales. */
export interface CotizacionFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre código y título. */
    q?: string;
    estado?: string;
    proveedorAdjudicadoId?: string;
    /** Derivado del backend a partir de fechaVencimiento — códigos exactos 'VIGENTE' | 'VENCIDA'. */
    vigencia?: string;
    /** yyyy-MM-dd */
    fechaEmisionDesde?: string;
    /** yyyy-MM-dd */
    fechaEmisionHasta?: string;
    /** yyyy-MM-dd */
    fechaVencimientoDesde?: string;
    /** yyyy-MM-dd */
    fechaVencimientoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/cotizaciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    /**
     * Filtros del listado de cotizaciones. TODO el filtrado ocurre en el backend
     * (`GET /purchases/api/cotizaciones`); la vista nunca filtra la página cargada.
     */
    listar(filtros: CotizacionFiltros = {}): Observable<CotizacionesPage> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            proveedorAdjudicadoId: filtros.proveedorAdjudicadoId,
            vigencia: filtros.vigencia,
            fechaEmisionDesde: filtros.fechaEmisionDesde,
            fechaEmisionHasta: filtros.fechaEmisionHasta,
            fechaVencimientoDesde: filtros.fechaVencimientoDesde,
            fechaVencimientoHasta: filtros.fechaVencimientoHasta,
        });

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => adaptSpringPage<CotizacionResumen>(raw, page, size) as CotizacionesPage)
        );
    }

    crear(request: CrearCotizacionRequest): Observable<CotizacionResumen> {
        return this.http.post<CotizacionResumen>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    getById(id: string): Observable<CotizacionDetalleDto> {
        return this.http.get<CotizacionDetalleDto>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    /** Solo permitido si la cotización está en estado CREADA (400 BusinessException en otro caso). */
    actualizar(id: string, request: ActualizarCotizacionRequest): Observable<CotizacionResumen> {
        return this.http.put<CotizacionResumen>(`${this.baseUrl}/${id}`, request, { headers: this.getHeaders() });
    }

    /** Solo permitido si la cotización está en estado CREADA (400 BusinessException en otro caso). */
    cancelar(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/cancelar`, {}, { headers: this.getHeaders() });
    }

    enviar(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/enviar`, {}, { headers: this.getHeaders() });
    }

    registrarRespuesta(id: string, request: RegistrarRespuestaRequest): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/registrar-respuesta`, request, {
            headers: this.getHeaders(),
        });
    }

    getComparativa(id: string): Observable<ComparativaDto> {
        return this.http.get<ComparativaDto>(`${this.baseUrl}/${id}/comparativa`, {
            headers: this.getHeaders(),
        });
    }

    adjudicar(id: string, proveedorId: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/adjudicar`, { proveedorId }, {
            headers: this.getHeaders(),
        });
    }

    convertirOc(id: string): Observable<{ ordenCompraId: string }> {
        return this.http.post<{ ordenCompraId: string }>(`${this.baseUrl}/${id}/convertir-oc`, {}, {
            headers: this.getHeaders(),
        });
    }
}
