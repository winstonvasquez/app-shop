import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Payment, PaymentRequest, Page } from '../models/tesoreria.model';

@Injectable({
    providedIn: 'root'
})
export class PagosService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrls.treasury}/api/tesoreria/pagos`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    getAll(page: number = 0, size: number = 20): Observable<Page<Payment> | Payment[]> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<Page<Payment> | Payment[]>(this.apiUrl, { params });
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
