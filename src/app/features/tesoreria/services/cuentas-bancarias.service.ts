import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { BankAccount, BankAccountRequest, Page } from '../models/tesoreria.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del listado de cuentas bancarias. Todos opcionales. */
export interface CuentaBancariaFiltros {
    page?: number;
    size?: number;
    estado?: string;
    tipoCuenta?: string;
    moneda?: string;
    banco?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
    /** Búsqueda por texto sobre banco/N° cuenta/CCI/descripción. */
    search?: string;
}

@Injectable({ providedIn: 'root' })
export class CuentasBancariasService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrls.treasury}/api/tesoreria/cuentas-bancarias`;

    private get tenantId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? 1);
    }

    /**
     * Filtros del listado de cuentas bancarias. TODO el filtrado ocurre en el backend
     * (`GET /treasury/api/tesoreria/cuentas-bancarias`); la vista nunca filtra la página cargada.
     */
    getAll(filtros: CuentaBancariaFiltros = {}): Observable<Page<BankAccount> | BankAccount[]> {
        let params = toHttpParams({
            tenantId: this.tenantId,
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            estado: filtros.estado,
            tipoCuenta: filtros.tipoCuenta,
            moneda: filtros.moneda,
            banco: filtros.banco,
            createdAtDesde: filtros.createdAtDesde,
            createdAtHasta: filtros.createdAtHasta,
            search: filtros.search,
        });
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
