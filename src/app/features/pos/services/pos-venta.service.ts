import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { VentaPosRequest, VentaPosResponse, DevolucionPosRequest, DevolucionPosResponse, TipoCambio } from '../models/venta-pos.model';
import { PageResponse } from '@core/models/pagination.model';
import { environment } from '@env/environment';
import { MONEDA } from '@shared/constants/sunat.constants';

/** Filtros server-side del historial de ventas del turno. Todos opcionales. */
export interface PosHistorialFiltros {
    search?: string;
    estado?: string;
    metodoPago?: string;
    tipoCpe?: string;
    moneda?: string;
    sucursalId?: number;
    /** yyyy-MM-dd */
    fechaCreacionDesde?: string;
    /** yyyy-MM-dd */
    fechaCreacionHasta?: string;
}

/** Filtros server-side del listado de devoluciones POS. Todos opcionales. */
export interface PosDevolucionFiltros {
    turnoId?: number;
    /** Búsqueda por N° de ticket de la venta original. */
    search?: string;
    motivo?: string;
    /** 'PROCESADA' | 'ANULADA' — estado de la devolución (no de la venta). */
    estado?: string;
    cajeroId?: number;
    /** yyyy-MM-dd — fecha en que se registró la devolución. */
    fechaDevolucionDesde?: string;
    fechaDevolucionHasta?: string;
    /** yyyy-MM-dd — fecha de la venta original. */
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class PosVentaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos;

    /**
     * Procesa una venta POS. Envía un header `Idempotency-Key` (UUID por venta) para que
     * el backend deduplique ante reintento de red: el mismo key NO crea dos ventas.
     */
    procesarVenta(request: VentaPosRequest, idempotencyKey?: string): Observable<VentaPosResponse> {
        const headers = idempotencyKey
            ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
            : undefined;
        return this.http.post<VentaPosResponse>(`${this.baseUrl}/ventas`, request, { headers });
    }

    anularVenta(ventaId: number): Observable<VentaPosResponse> {
        return this.http.post<VentaPosResponse>(`${this.baseUrl}/ventas/${ventaId}/anular`, {});
    }

    getRecibo(ventaId: number): Observable<VentaPosResponse> {
        return this.http.get<VentaPosResponse>(`${this.baseUrl}/ventas/${ventaId}/recibo`);
    }

    buscarPorTicket(ticket: string): Observable<VentaPosResponse> {
        return this.http.get<VentaPosResponse>(`${this.baseUrl}/ventas/buscar`, {
            params: { ticket }
        });
    }

    /**
     * Historial de ventas del turno, paginado. TODO el filtrado ocurre en el backend
     * (`GET /api/pos/turno/{turnoId}/historial`) — nunca filtra la página cargada.
     */
    getHistorial(
        turnoId: number,
        filtros: PosHistorialFiltros = {},
        page = 0,
        size = 20
    ): Observable<PageResponse<VentaPosResponse>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.search) params = params.set('search', filtros.search);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.metodoPago) params = params.set('metodoPago', filtros.metodoPago);
        if (filtros.tipoCpe) params = params.set('tipoCpe', filtros.tipoCpe);
        if (filtros.moneda) params = params.set('moneda', filtros.moneda);
        if (filtros.sucursalId != null) params = params.set('sucursalId', filtros.sucursalId.toString());
        if (filtros.fechaCreacionDesde) params = params.set('fechaCreacionDesde', filtros.fechaCreacionDesde);
        if (filtros.fechaCreacionHasta) params = params.set('fechaCreacionHasta', filtros.fechaCreacionHasta);

        return this.http.get<PageResponse<VentaPosResponse>>(
            `${this.baseUrl}/turno/${turnoId}/historial`,
            { params }
        );
    }

    procesarDevolucion(ventaId: number, request: DevolucionPosRequest): Observable<DevolucionPosResponse> {
        return this.http.post<DevolucionPosResponse>(
            `${this.baseUrl}/ventas/${ventaId}/devolucion`, request
        );
    }

    /**
     * Listado paginado de devoluciones POS (`GET /api/pos/devoluciones`). TODO el filtrado
     * ocurre en el backend — la vista nunca filtra un signal de sesión en memoria.
     */
    getDevoluciones(
        companyId: number,
        filtros: PosDevolucionFiltros = {},
        page = 0,
        size = 10
    ): Observable<PageResponse<DevolucionPosResponse>> {
        let params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.turnoId != null) params = params.set('turnoId', filtros.turnoId.toString());
        if (filtros.search) params = params.set('search', filtros.search);
        if (filtros.motivo) params = params.set('motivo', filtros.motivo);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.cajeroId != null) params = params.set('cajeroId', filtros.cajeroId.toString());
        if (filtros.fechaDevolucionDesde) params = params.set('fechaDevolucionDesde', filtros.fechaDevolucionDesde);
        if (filtros.fechaDevolucionHasta) params = params.set('fechaDevolucionHasta', filtros.fechaDevolucionHasta);
        if (filtros.fechaCreacionDesde) params = params.set('fechaCreacionDesde', filtros.fechaCreacionDesde);
        if (filtros.fechaCreacionHasta) params = params.set('fechaCreacionHasta', filtros.fechaCreacionHasta);

        return this.http.get<PageResponse<DevolucionPosResponse>>(`${this.baseUrl}/devoluciones`, { params });
    }

    enviarRecibo(ventaId: number, email: string): Observable<{ status: string; email: string }> {
        return this.http.post<{ status: string; email: string }>(
            `${this.baseUrl}/ventas/${ventaId}/enviar-recibo`,
            null,
            { params: { email } }
        );
    }

    getTipoCambioVigente(companyId: number, moneda = MONEDA.USD): Observable<TipoCambio> {
        return this.http.get<TipoCambio>(`${this.baseUrl}/tipo-cambio/vigente`, {
            params: { companyId: companyId.toString(), moneda }
        });
    }

    registrarTipoCambio(dto: Partial<TipoCambio>): Observable<TipoCambio> {
        return this.http.post<TipoCambio>(`${this.baseUrl}/tipo-cambio`, dto);
    }
}
