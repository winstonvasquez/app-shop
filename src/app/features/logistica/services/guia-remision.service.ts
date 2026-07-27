import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GuiaRemision, CreateGuiaRemisionDto, Pagination } from '../models/guia-remision.model';

@Injectable({ providedIn: 'root' })
export class GuiaRemisionService {
    private http = inject(HttpClient);
    private baseUrl = '/logistics/api/guias-remision';

    /** Filtros server-side del listado de GRE. Todos opcionales. */
    getGuias(
        companyId: string,
        params?: {
            page?: number; size?: number; sort?: string;
            /** Búsqueda por texto sobre serie/número/destinatario/vehículo/conductor. */
            q?: string;
            estado?: string;
            motivoTraslado?: string;
            modalidadTraslado?: string;
            almacenOrigenId?: string;
            fechaEmisionDesde?: string; fechaEmisionHasta?: string;
            fechaInicioTrasladoDesde?: string; fechaInicioTrasladoHasta?: string;
        }
    ): Observable<Pagination<GuiaRemision>> {
        let httpParams = new HttpParams().set('companyId', companyId);
        if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
        if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
        if (params?.sort) httpParams = httpParams.set('sort', params.sort);
        if (params?.q) httpParams = httpParams.set('q', params.q);
        if (params?.estado) httpParams = httpParams.set('estado', params.estado);
        if (params?.motivoTraslado) httpParams = httpParams.set('motivoTraslado', params.motivoTraslado);
        if (params?.modalidadTraslado) httpParams = httpParams.set('modalidadTraslado', params.modalidadTraslado);
        if (params?.almacenOrigenId) httpParams = httpParams.set('almacenOrigenId', params.almacenOrigenId);
        if (params?.fechaEmisionDesde) httpParams = httpParams.set('fechaEmisionDesde', params.fechaEmisionDesde);
        if (params?.fechaEmisionHasta) httpParams = httpParams.set('fechaEmisionHasta', params.fechaEmisionHasta);
        if (params?.fechaInicioTrasladoDesde) httpParams = httpParams.set('fechaInicioTrasladoDesde', params.fechaInicioTrasladoDesde);
        if (params?.fechaInicioTrasladoHasta) httpParams = httpParams.set('fechaInicioTrasladoHasta', params.fechaInicioTrasladoHasta);
        return this.http.get<Pagination<GuiaRemision>>(this.baseUrl, { params: httpParams });
    }

    getGuiaById(id: string, companyId: string): Observable<GuiaRemision> {
        return this.http.get<GuiaRemision>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    createGuia(data: CreateGuiaRemisionDto, tenantId: string, companyId: string): Observable<GuiaRemision> {
        return this.http.post<GuiaRemision>(this.baseUrl, data, { params: { tenantId, companyId } });
    }

    actualizarEstado(id: string, estado: string, companyId: string): Observable<GuiaRemision> {
        return this.http.put<GuiaRemision>(
            `${this.baseUrl}/${id}/estado`,
            null,
            { params: { estado, companyId } }
        );
    }

    /**
     * Envía la GRE a SUNAT vía microshopcommon. Transiciona PENDIENTE -> EMITIDA en el
     * backend (GuiaRemisionCommandService#enviarSunat). Único camino de salida para las
     * GRE auto-generadas desde despacho (GuiaRemisionAutoService#generarDesdeEnvio).
     */
    enviarSunat(id: string, companyId: string): Observable<GuiaRemision> {
        return this.http.post<GuiaRemision>(
            `${this.baseUrl}/${id}/enviar-sunat`,
            null,
            { params: { companyId } }
        );
    }
}
