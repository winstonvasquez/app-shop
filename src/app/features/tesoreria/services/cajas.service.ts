import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CashRegister } from '../models/tesoreria.model';

@Injectable({
    providedIn: 'root'
})
export class CajasService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.treasury}/api/tesoreria/cajas`;

    getAll(page: number = 0, size: number = 20): Observable<any> {
        const params = new HttpParams()
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
