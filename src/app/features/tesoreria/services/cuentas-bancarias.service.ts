import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { BankAccount, BankAccountRequest, Page } from '../models/tesoreria.model';

@Injectable({ providedIn: 'root' })
export class CuentasBancariasService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.treasury}/api/tesoreria/cuentas-bancarias`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    getAll(page: number = 0, size: number = 20): Observable<Page<BankAccount> | BankAccount[]> {
        const params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('page', page.toString())
            .set('size', size.toString());
        return this.http.get<Page<BankAccount> | BankAccount[]>(this.apiUrl, { params });
    }

    create(req: BankAccountRequest): Observable<BankAccount> {
        return this.http.post<BankAccount>(this.apiUrl, req);
    }

    update(id: number, req: BankAccountRequest): Observable<BankAccount> {
        return this.http.put<BankAccount>(`${this.apiUrl}/${id}`, req);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    changeStatus(id: number, estado: string): Observable<BankAccount> {
        return this.http.post<BankAccount>(`${this.apiUrl}/${id}/estado`, { estado });
    }
}
