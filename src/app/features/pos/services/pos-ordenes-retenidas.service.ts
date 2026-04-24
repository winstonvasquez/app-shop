import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface OrdenRetenida {
    id: number;
    turnoCajaId: number;
    nombre: string;
    itemsJson: string;
    descuento: number;
    clienteId: number | null;
    clienteNombre: string | null;
    metodoPago: string | null;
    estado: 'RETENIDA' | 'RECUPERADA' | 'EXPIRADA';
    fechaCreacion: string;
}

export interface OrdenRetenidaRequest {
    turnoCajaId: number;
    nombre?: string;
    itemsJson: string;
    descuento?: number;
    clienteId?: number;
    clienteNombre?: string;
    metodoPago?: string;
}

@Injectable({ providedIn: 'root' })
export class PosOrdenesRetenidasService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos;

    retener(dto: OrdenRetenidaRequest): Observable<OrdenRetenida> {
        return this.http.post<OrdenRetenida>(`${this.baseUrl}/ordenes-retenidas`, dto);
    }

    getRetenidas(turnoId: number): Observable<OrdenRetenida[]> {
        return this.http.get<OrdenRetenida[]>(`${this.baseUrl}/turno/${turnoId}/ordenes-retenidas`);
    }

    recuperar(ordenId: number): Observable<OrdenRetenida> {
        return this.http.post<OrdenRetenida>(`${this.baseUrl}/ordenes-retenidas/${ordenId}/recuperar`, {});
    }

    descartar(ordenId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/ordenes-retenidas/${ordenId}`);
    }
}
