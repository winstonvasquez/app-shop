import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GuiaRemision, CreateGuiaRemisionDto, Pagination } from '../models/guia-remision.model';
import { toHttpParams } from '@core/utils/http-params.util';

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
        // El tipo de `params` declara exactamente las claves que el backend acepta, así que
        // el spread es equivalente a re-listarlas una a una; `toHttpParams` ya omite las
        // ausentes (undefined/null/'').
        return this.http.get<Pagination<GuiaRemision>>(this.baseUrl, {
            params: toHttpParams({ companyId, ...params }),
        });
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
