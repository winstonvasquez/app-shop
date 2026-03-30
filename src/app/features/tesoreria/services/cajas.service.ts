import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '@core/auth/auth.service';
import { CashRegister } from '../models/tesoreria.model';

@Injectable({
    providedIn: 'root'
})
export class CajasService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.treasury}/api/tesoreria/cajas`;

    private get tenantId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    getAll(page: number = 0, size: number = 20): Observable<any> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId.toString())
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<any>(this.apiUrl, { params });
    }

    getById(id: number): Observable<CashRegister> {
        return this.http.get<CashRegister>(`${this.apiUrl}/${id}`);
    }

    create(caja: any): Observable<CashRegister> {
        return this.http.post<CashRegister>(this.apiUrl, caja);
    }

    open(id: number, saldoInicial: number): Observable<CashRegister> {
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/open`, { saldoInicial });
    }

    close(id: number): Observable<CashRegister> {
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/close`, {});
    }
}
