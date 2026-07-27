import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Envio, EnvioPage, CreateEnvioDto, TrackingEvent } from '../models/envio.model';
import { PAGINATION } from '@shared/constants/app.constants';

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
        let params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? PAGINATION.defaultPageSize));
        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.status) params = params.set('status', filtros.status);
        if (filtros.carrierId) params = params.set('carrierId', filtros.carrierId);
        if (filtros.fulfillmentType) params = params.set('fulfillmentType', filtros.fulfillmentType);
        if (filtros.dispatchedAtDesde) params = params.set('dispatchedAtDesde', filtros.dispatchedAtDesde);
        if (filtros.dispatchedAtHasta) params = params.set('dispatchedAtHasta', filtros.dispatchedAtHasta);
        if (filtros.estimatedDeliveryDesde) params = params.set('estimatedDeliveryDesde', filtros.estimatedDeliveryDesde);
        if (filtros.estimatedDeliveryHasta) params = params.set('estimatedDeliveryHasta', filtros.estimatedDeliveryHasta);
        if (filtros.actualDeliveryDesde) params = params.set('actualDeliveryDesde', filtros.actualDeliveryDesde);
        if (filtros.actualDeliveryHasta) params = params.set('actualDeliveryHasta', filtros.actualDeliveryHasta);
        if (filtros.registradoDesde) params = params.set('registradoDesde', filtros.registradoDesde);
        if (filtros.registradoHasta) params = params.set('registradoHasta', filtros.registradoHasta);
        return this.http.get<EnvioPage>(this.baseUrl, { params });
    }

    getById(id: string, companyId: string): Observable<Envio> {
        return this.http.get<Envio>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    create(dto: CreateEnvioDto): Observable<Envio> {
        return this.http.post<Envio>(this.baseUrl, dto);
    }

    addTrackingEvent(shipmentId: string, event: Partial<TrackingEvent>): Observable<TrackingEvent> {
        return this.http.post<TrackingEvent>(`${this.trackingUrl}/${shipmentId}/events`, event);
    }

    trackByNumber(trackingNumber: string): Observable<Envio> {
        return this.http.get<Envio>(`${this.trackingUrl}/${trackingNumber}`);
    }
}
