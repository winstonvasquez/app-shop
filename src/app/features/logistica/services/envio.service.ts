import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Envio, EnvioPage, CreateEnvioDto, TrackingEvent } from '../models/envio.model';

@Injectable({ providedIn: 'root' })
export class EnvioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl     = '/logistics/api/shipments';
    private readonly trackingUrl = '/logistics/api/tracking';

    getEnvios(companyId: string, page = 0, size = 10, status?: string): Observable<EnvioPage> {
        let params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(page))
            .set('size', String(size));
        if (status) params = params.set('status', status);
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
