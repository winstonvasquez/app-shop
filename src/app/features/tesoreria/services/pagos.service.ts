import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { Payment, PaymentRequest, Page } from '../models/tesoreria.model';
import { toHttpParams } from '@core/utils/http-params.util';

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

    getAll(page: number = 0, size: number = 20, filters?: {
        estado?: string; tipoPago?: string; metodoPago?: string;
        fechaSolicitudDesde?: string; fechaSolicitudHasta?: string;
    }): Observable<Page<Payment> | Payment[]> {
        let params = toHttpParams({
            tenantId: this.tenantId,
            page,
            size,
            estado: filters?.estado,
            tipoPago: filters?.tipoPago,
            metodoPago: filters?.metodoPago,
            fechaSolicitudDesde: filters?.fechaSolicitudDesde,
            fechaSolicitudHasta: filters?.fechaSolicitudHasta,
        });
        return this.http.get<Page<Payment> | Payment[]>(this.apiUrl, { params });
    }

    getById(id: number): Observable<Payment> {
        return this.http.get<Payment>(`${this.apiUrl}/${id}`, { params: this.tenantParams() });
    }

    create(payment: PaymentRequest): Observable<Payment> {
        return this.http.post<Payment>(this.apiUrl, payment);
    }

    // Rutas y tenantId del backend (PaymentController: /aprobar, /rechazar, /pagar con @RequestParam tenantId).
    approve(id: number): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/aprobar`, {}, { params: this.tenantParams() });
    }

    /** `motivo` viaja en el body: el backend lo lee de `Map<String,String>`. */
    reject(id: number, motivo: string): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/rechazar`, { motivo }, { params: this.tenantParams() });
    }

    markAsPaid(id: number): Observable<Payment> {
        return this.http.post<Payment>(`${this.apiUrl}/${id}/pagar`, {}, { params: this.tenantParams() });
    }

    private tenantParams() {
        return toHttpParams({ tenantId: this.tenantId });
    }
}
