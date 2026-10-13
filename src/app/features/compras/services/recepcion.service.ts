import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ItemRecepcionRequest, Recepcion } from '../models/orden-compra.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

export interface RecepcionPage {
    content: Recepcion[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateRecepcionRequest {
    ordenCompraId: string;
    numeroGuia?: string;
    transportista?: string;
    fechaRecepcion?: string;
    responsable?: string;
    almacenDestino?: string;
    observaciones?: string;
    items?: ItemRecepcionRequest[];
}

/** Filtros server-side del listado de recepciones. Todos opcionales. */
export interface RecepcionFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre N° recepción, guía de remisión o código de OC. */
    q?: string;
    estado?: string;
    almacenDestino?: string;
    proveedorId?: string;
    transportista?: string;
    responsable?: string;
    /** yyyy-MM-dd */
    fechaRecepcionDesde?: string;
    /** yyyy-MM-dd */
    fechaRecepcionHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class RecepcionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/recepciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    /**
     * Filtros del listado de recepciones. TODO el filtrado ocurre en el backend
     * (`GET /purchases/api/recepciones`); la vista nunca filtra la página cargada.
     */
    getRecepciones(filtros: RecepcionFiltros = {}): Observable<RecepcionPage> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            almacenDestino: filtros.almacenDestino,
            proveedorId: filtros.proveedorId,
            transportista: filtros.transportista,
            responsable: filtros.responsable,
            fechaRecepcionDesde: filtros.fechaRecepcionDesde,
            fechaRecepcionHasta: filtros.fechaRecepcionHasta,
        });

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => adaptSpringPage<Recepcion>(raw, page, size) as RecepcionPage)
        );
    }

    getRecepcionById(id: string): Observable<Recepcion> {
        return this.http.get<Recepcion>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    getRecepcionesByOrden(ordenCompraId: string): Observable<Recepcion[]> {
        return this.http.get<Recepcion[]>(`${this.baseUrl}/por-orden/${ordenCompraId}`, {
            headers: this.getHeaders(),
        });
    }

    createRecepcion(request: CreateRecepcionRequest): Observable<Recepcion> {
        return this.http.post<Recepcion>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    confirmarRecepcion(id: string): Observable<Recepcion> {
        return this.http.post<Recepcion>(`${this.baseUrl}/${id}/confirmar`, {}, { headers: this.getHeaders() });
    }
}
