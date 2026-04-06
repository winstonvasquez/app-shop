import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface MovimientoCaja {
    id: number;
    turnoCajaId: number;
    tipo: 'INGRESO' | 'RETIRO';
    monto: number;
    motivo: string;
    autorizadoPor: number | null;
    fechaCreacion: string;
}

export interface MovimientoCajaRequest {
    tipo: 'INGRESO' | 'RETIRO';
    monto: number;
    motivo: string;
    autorizadoPor?: number;
}

@Injectable({ providedIn: 'root' })
export class PosMovimientosCajaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos;

    registrar(turnoId: number, dto: MovimientoCajaRequest): Observable<MovimientoCaja> {
        return this.http.post<MovimientoCaja>(`${this.baseUrl}/turno/${turnoId}/movimientos`, dto);
    }

    getMovimientos(turnoId: number): Observable<MovimientoCaja[]> {
        return this.http.get<MovimientoCaja[]>(`${this.baseUrl}/turno/${turnoId}/movimientos`);
    }
}
