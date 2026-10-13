import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Devolucion, CreateDevolucionDto, CreateInspeccionDto, InspeccionDevolucion } from '../models/devolucion.model';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del listado de devoluciones (`GET /logistics/api/returns`). Todos opcionales. */
export interface DevolucionFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre tracking de devolución, descripción y notas. */
    q?: string;
    status?: string;
    reason?: string;
    warehouseId?: string;
    /** yyyy-MM-dd */
    requestedAtDesde?: string;
    requestedAtHasta?: string;
    refundedAtDesde?: string;
    refundedAtHasta?: string;
    receivedAtDesde?: string;
    receivedAtHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/returns';

    /**
     * Lista PAGINADA de devoluciones del tenant. El backend (ReturnController.getAllReturnRequests)
     * pasó de `List` a `Page` (ronda 2026-07-27) y acepta filtros de q/status/reason/warehouseId
     * y rangos de fecha de solicitud/reembolso/recepción. TODO el filtrado ocurre en el backend;
     * la vista nunca filtra la página cargada.
     */
    getDevoluciones(companyId: string, filtros: DevolucionFiltros = {}): Observable<PageResponse<Devolucion>> {
        let params = toHttpParams({
            companyId,
            page: filtros.page ?? 0,
            size: filtros.size ?? 10,
            q: filtros.q,
            status: filtros.status,
            reason: filtros.reason,
            warehouseId: filtros.warehouseId,
            requestedAtDesde: filtros.requestedAtDesde,
            requestedAtHasta: filtros.requestedAtHasta,
            refundedAtDesde: filtros.refundedAtDesde,
            refundedAtHasta: filtros.refundedAtHasta,
            receivedAtDesde: filtros.receivedAtDesde,
            receivedAtHasta: filtros.receivedAtHasta,
        });
        return this.http.get<PageResponse<Devolucion>>(this.baseUrl, { params });
    }

    getById(id: string, companyId: string): Observable<Devolucion> {
        return this.http.get<Devolucion>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    /**
     * Crea una solicitud de devolución logística (ver `ReturnController.createReturnRequest`).
     * `customerId` va como query param, NO en el body (contrato del backend).
     */
    create(dto: CreateDevolucionDto, customerId: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(this.baseUrl, dto, { params: { customerId } });
    }

    aprobar(id: string, companyId: string, returnTrackingNumber?: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(
            `${this.baseUrl}/${id}/approve`,
            returnTrackingNumber ? { returnTrackingNumber } : {},
            { params: { companyId } }
        );
    }

    rechazar(id: string, motivo: string, companyId: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(`${this.baseUrl}/${id}/reject`, { motivo }, { params: { companyId } });
    }

    marcarRecibida(id: string, companyId: string, warehouseId?: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(
            `${this.baseUrl}/${id}/receive`,
            warehouseId ? { warehouseId } : {},
            { params: { companyId } }
        );
    }

    /**
     * Inspección estructurada (`ReturnController.createInspection`): pasa la devolución a INSPECTED y
     * reingresa stock por cada ítem con disposición RESTOCK. Responde 201 con la inspección, no con la devolución.
     */
    registrarInspeccion(id: string, dto: CreateInspeccionDto): Observable<InspeccionDevolucion> {
        return this.http.post<InspeccionDevolucion>(`${this.baseUrl}/${id}/inspection`, dto);
    }

    /** 404 si la devolución no tiene inspección estructurada. */
    getInspeccion(id: string): Observable<InspeccionDevolucion> {
        return this.http.get<InspeccionDevolucion>(`${this.baseUrl}/${id}/inspection`);
    }

    registrarReembolso(id: string, amount: number, notas: string, companyId: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(
            `${this.baseUrl}/${id}/refund`,
            { monto: amount, notas },
            { params: { companyId } }
        );
    }
}
