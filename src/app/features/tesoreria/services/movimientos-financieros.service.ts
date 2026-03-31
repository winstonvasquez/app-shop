import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { FinancialMovement } from '../models/tesoreria.model';

@Injectable({
    providedIn: 'root'
})
export class MovimientosFinancierosService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.treasury}/api/tesoreria/movimientos`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    getAll(fechaInicio?: string, fechaFin?: string, page: number = 0, size: number = 20): Observable<any> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('page', page.toString())
            .set('size', size.toString());

        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);

        return this.http.get<any>(this.apiUrl, { params });
    }

    getFlujoCaja(fechaInicio: string, fechaFin: string): Observable<number> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('fechaInicio', fechaInicio)
            .set('fechaFin', fechaFin);
        return this.http.get<number>(`${this.apiUrl}/flujo-caja`, { params });
    }

    registerMovement(movement: any): Observable<FinancialMovement> {
        return this.http.post<FinancialMovement>(this.apiUrl, movement);
    }
}
