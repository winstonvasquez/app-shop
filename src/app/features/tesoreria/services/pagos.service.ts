import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Payment, PaymentRequest } from '../models/tesoreria.model';

@Injectable({
    providedIn: 'root'
})
export class PagosService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.treasury}/api/tesoreria/pagos`;

    getAll(page: number = 0, size: number = 20): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<any>(this.apiUrl, { params });
    }

    getById(id: number): Observable<Payment> {
        return this.http.get<Payment>(`${this.apiUrl}/${id}`);
    }

    create(payment: PaymentRequest): Observable<Payment> {
        return this.http.post<Payment>(this.apiUrl, payment);
    }

    approve(id: number): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/approve`, {});
    }

    reject(id: number): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/reject`, {});
    }

    markAsPaid(id: number): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/pay`, {});
    }
}
