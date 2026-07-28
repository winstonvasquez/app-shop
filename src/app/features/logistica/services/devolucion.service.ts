import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Devolucion, CreateDevolucionDto } from '../models/devolucion.model';
import { PageResponse } from '@core/models/pagination.model';

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
        let params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 10));
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.status) params = params.set('status', filtros.status);
        if (filtros.reason) params = params.set('reason', filtros.reason);
        if (filtros.warehouseId) params = params.set('warehouseId', filtros.warehouseId);
        if (filtros.requestedAtDesde) params = params.set('requestedAtDesde', filtros.requestedAtDesde);
        if (filtros.requestedAtHasta) params = params.set('requestedAtHasta', filtros.requestedAtHasta);
        if (filtros.refundedAtDesde) params = params.set('refundedAtDesde', filtros.refundedAtDesde);
        if (filtros.refundedAtHasta) params = params.set('refundedAtHasta', filtros.refundedAtHasta);
        if (filtros.receivedAtDesde) params = params.set('receivedAtDesde', filtros.receivedAtDesde);
        if (filtros.receivedAtHasta) params = params.set('receivedAtHasta', filtros.receivedAtHasta);
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

    registrarInspeccion(id: string, notes: string, companyId: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(
            `${this.baseUrl}/${id}/inspect`,
            { inspectionNotes: notes },
            { params: { companyId } }
        );
    }

    registrarReembolso(id: string, amount: number, notas: string, companyId: string): Observable<Devolucion> {
        return this.http.put<Devolucion>(
            `${this.baseUrl}/${id}/refund`,
            { monto: amount, notas },
            { params: { companyId } }
        );
    }
}
