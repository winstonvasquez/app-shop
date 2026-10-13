import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { VentaPosRequest, VentaPosResponse, DevolucionPosRequest, DevolucionPosResponse, TipoCambio } from '../models/venta-pos.model';
import { PageResponse } from '@core/models/pagination.model';
import { environment } from '@env/environment';
import { MONEDA } from '@shared/constants/sunat.constants';
import { toHttpParams } from '@core/utils/http-params.util';

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

    /** `autorizacionToken` (ANULACION, emitido para este `ventaId`) va en la cabecera; ADMIN/GERENTE anulan sin él. */
    anularVenta(ventaId: number, autorizacionToken?: string): Observable<VentaPosResponse> {
        const headers = autorizacionToken
            ? new HttpHeaders({ 'X-Autorizacion-Supervisor': autorizacionToken })
            : undefined;
        return this.http.post<VentaPosResponse>(`${this.baseUrl}/ventas/${ventaId}/anular`, {}, { headers });
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
        let params = toHttpParams({
            page,
            size,
            search: filtros.search,
            estado: filtros.estado,
            metodoPago: filtros.metodoPago,
            tipoCpe: filtros.tipoCpe,
            moneda: filtros.moneda,
            sucursalId: filtros.sucursalId,
            fechaCreacionDesde: filtros.fechaCreacionDesde,
            fechaCreacionHasta: filtros.fechaCreacionHasta,
        });

        return this.http.get<PageResponse<VentaPosResponse>>(
            `${this.baseUrl}/turno/${turnoId}/historial`,
            { params }
        );
    }

    /** `autorizacionToken` (DEVOLUCION, emitido para este `ventaId`) va en la cabecera; ADMIN/GERENTE devuelven sin él. */
    procesarDevolucion(ventaId: number, request: DevolucionPosRequest, autorizacionToken?: string): Observable<DevolucionPosResponse> {
        const headers = autorizacionToken
            ? new HttpHeaders({ 'X-Autorizacion-Supervisor': autorizacionToken })
            : undefined;
        return this.http.post<DevolucionPosResponse>(
            `${this.baseUrl}/ventas/${ventaId}/devolucion`, request, { headers }
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
        let params = toHttpParams({
            companyId,
            page,
            size,
            turnoId: filtros.turnoId,
            search: filtros.search,
            motivo: filtros.motivo,
            estado: filtros.estado,
            cajeroId: filtros.cajeroId,
            fechaDevolucionDesde: filtros.fechaDevolucionDesde,
            fechaDevolucionHasta: filtros.fechaDevolucionHasta,
            fechaCreacionDesde: filtros.fechaCreacionDesde,
            fechaCreacionHasta: filtros.fechaCreacionHasta,
        });

        return this.http.get<PageResponse<DevolucionPosResponse>>(`${this.baseUrl}/devoluciones`, { params });
    }

    /** Tope (%) de descuento que el cajero puede dar sin PIN de supervisor, configurado por empresa. */
    getMaxDescuentoSinAutorizacion(companyId: number): Observable<number> {
        return this.http.get<number>(`${this.baseUrl}/config/max-descuento`, {
            params: { companyId: companyId.toString() }
        });
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
