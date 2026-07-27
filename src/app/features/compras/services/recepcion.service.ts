import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ItemRecepcionRequest, Recepcion } from '../models/orden-compra.model';

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

        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.almacenDestino) params = params.set('almacenDestino', filtros.almacenDestino);
        if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
        if (filtros.transportista) params = params.set('transportista', filtros.transportista);
        if (filtros.responsable) params = params.set('responsable', filtros.responsable);
        if (filtros.fechaRecepcionDesde) params = params.set('fechaRecepcionDesde', filtros.fechaRecepcionDesde);
        if (filtros.fechaRecepcionHasta) params = params.set('fechaRecepcionHasta', filtros.fechaRecepcionHasta);

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as Recepcion[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as RecepcionPage;
            })
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
