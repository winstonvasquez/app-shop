import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Devolucion } from '../models/devolucion.model';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/returns';

    /**
     * Lista devoluciones del tenant. El backend (ReturnController.getAllReturnRequests /
     * getReturnRequestsByStatus) devuelve una lista plana sin paginar — ver nota en
     * devolucion.model.ts. La paginación se aplica client-side en el componente.
     */
    getDevoluciones(companyId: string, status?: string): Observable<Devolucion[]> {
        const url = status ? `${this.baseUrl}/status/${status}` : this.baseUrl;
        return this.http.get<Devolucion[]>(url, { params: { companyId } });
    }

    getById(id: string, companyId: string): Observable<Devolucion> {
        return this.http.get<Devolucion>(`${this.baseUrl}/${id}`, { params: { companyId } });
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
