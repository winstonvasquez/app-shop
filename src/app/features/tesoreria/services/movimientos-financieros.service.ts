import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { FinancialMovement, Page } from '../models/tesoreria.model';

export interface FinancialMovementRequest {
    tenantId: number;
    tipoMovimiento: string;
    origen: string;
    monto: number;
    moneda: string;
    fecha: string;
    descripcion: string;
    cajaId?: number;
}

@Injectable({
    providedIn: 'root'
})
export class MovimientosFinancierosService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrls.treasury}/api/tesoreria/movimientos`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    getAll(fechaInicio?: string, fechaFin?: string, page: number = 0, size: number = 20): Observable<Page<FinancialMovement> | FinancialMovement[]> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('page', page.toString())
            .set('size', size.toString());

        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);

        return this.http.get<Page<FinancialMovement> | FinancialMovement[]>(this.apiUrl, { params });
    }

    getFlujoCaja(fechaInicio: string, fechaFin: string): Observable<number> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('desde', fechaInicio)
            .set('hasta', fechaFin);
        // El backend retorna { flujoNeto, desde, hasta, signo, tenantId }; extraemos el número.
        return this.http.get<{ flujoNeto: number }>(`${this.apiUrl}/flujo-caja`, { params })
            .pipe(map(r => Number(r?.flujoNeto ?? 0)));
    }

    registerMovement(movement: FinancialMovementRequest): Observable<FinancialMovement> {
        return this.http.post<FinancialMovement>(this.apiUrl, movement);
    }
}
