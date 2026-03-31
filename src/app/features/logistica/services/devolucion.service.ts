import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Devolucion, DevolucionPage, DevolucionStatus } from '../models/devolucion.model';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/returns';

    getDevoluciones(companyId: string, page = 0, size = 10, status?: string): Observable<DevolucionPage> {
        let params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(page))
            .set('size', String(size));
        if (status) params = params.set('status', status);
        return this.http.get<DevolucionPage>(this.baseUrl, { params });
    }

    getById(id: string, companyId: string): Observable<Devolucion> {
        return this.http.get<Devolucion>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    aprobar(id: string, companyId: string): Observable<Devolucion> {
        return this.http.patch<Devolucion>(`${this.baseUrl}/${id}/approve`, {}, { params: { companyId } });
    }

    rechazar(id: string, companyId: string): Observable<Devolucion> {
        return this.http.patch<Devolucion>(`${this.baseUrl}/${id}/reject`, {}, { params: { companyId } });
    }

    marcarRecibida(id: string, companyId: string): Observable<Devolucion> {
        return this.http.patch<Devolucion>(`${this.baseUrl}/${id}/receive`, {}, { params: { companyId } });
    }

    registrarInspeccion(id: string, notes: string, companyId: string): Observable<Devolucion> {
        return this.http.patch<Devolucion>(`${this.baseUrl}/${id}/inspect`, { inspectionNotes: notes }, { params: { companyId } });
    }

    registrarReembolso(id: string, amount: number, companyId: string): Observable<Devolucion> {
        return this.http.patch<Devolucion>(`${this.baseUrl}/${id}/refund`, { refundAmount: amount }, { params: { companyId } });
    }
}
