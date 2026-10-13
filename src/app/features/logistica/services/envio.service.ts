import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Envio, EnvioPage, CreateEnvioDto, TrackingEvent, EnvioStatus } from '../models/envio.model';

/** Body de `PUT /logistics/api/shipments/{id}/status` — alineado con `UpdateShipmentStatusRequest`. */
export interface UpdateEnvioStatusBody {
    status: EnvioStatus;
    location: string;
    description: string;
}
import { PAGINATION } from '@shared/constants/app.constants';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del listado de envíos (`GET /logistics/api/shipments`). Todos opcionales. */
export interface EnvioFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre N° tracking, destinatario y dirección. */
    q?: string;
    status?: string;
    carrierId?: string;
    fulfillmentType?: string;
    /** yyyy-MM-dd */
    dispatchedAtDesde?: string;
    dispatchedAtHasta?: string;
    estimatedDeliveryDesde?: string;
    estimatedDeliveryHasta?: string;
    actualDeliveryDesde?: string;
    actualDeliveryHasta?: string;
    /** Rango sobre `fechaCreacion` — el backend lo expone como `registradoDesde/Hasta`. */
    registradoDesde?: string;
    registradoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class EnvioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl     = '/logistics/api/shipments';
    private readonly trackingUrl = '/logistics/api/tracking';

    /**
     * Filtros del listado de envíos. TODO el filtrado ocurre en el backend
     * (`ShipmentController#getAllShipments`); la vista nunca filtra la página cargada.
     */
    getEnvios(companyId: string, filtros: EnvioFiltros = {}): Observable<EnvioPage> {
        let params = toHttpParams({
            companyId,
            page: filtros.page ?? 0,
            size: filtros.size ?? PAGINATION.defaultPageSize,
            q: filtros.q,
            status: filtros.status,
            carrierId: filtros.carrierId,
            fulfillmentType: filtros.fulfillmentType,
            dispatchedAtDesde: filtros.dispatchedAtDesde,
            dispatchedAtHasta: filtros.dispatchedAtHasta,
            estimatedDeliveryDesde: filtros.estimatedDeliveryDesde,
            estimatedDeliveryHasta: filtros.estimatedDeliveryHasta,
            actualDeliveryDesde: filtros.actualDeliveryDesde,
            actualDeliveryHasta: filtros.actualDeliveryHasta,
            registradoDesde: filtros.registradoDesde,
            registradoHasta: filtros.registradoHasta,
        });
        return this.http.get<EnvioPage>(this.baseUrl, { params });
    }

    getById(id: string, companyId: string): Observable<Envio> {
        return this.http.get<Envio>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    create(dto: CreateEnvioDto): Observable<Envio> {
        return this.http.post<Envio>(this.baseUrl, dto);
    }

    /**
     * Avanza el estado de un envío (ver `ShipmentController.updateShipmentStatus`).
     * Vía usada por transportistas sin integración API: sin esto, un envío nunca
     * llegaba a OUT_FOR_DELIVERY y "Confirmar entrega" quedaba inalcanzable.
     */
    updateStatus(id: string, body: UpdateEnvioStatusBody): Observable<Envio> {
        return this.http.put<Envio>(`${this.baseUrl}/${id}/status`, body);
    }

    addTrackingEvent(shipmentId: string, event: Partial<TrackingEvent>): Observable<TrackingEvent> {
        return this.http.post<TrackingEvent>(`${this.trackingUrl}/${shipmentId}/events`, event);
    }

    trackByNumber(trackingNumber: string): Observable<Envio> {
        return this.http.get<Envio>(`${this.trackingUrl}/${trackingNumber}`);
    }
}
