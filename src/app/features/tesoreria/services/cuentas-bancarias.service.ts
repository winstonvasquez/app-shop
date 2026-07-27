import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { BankAccount, BankAccountRequest, Page } from '../models/tesoreria.model';

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
        let params = new HttpParams()
            .set('tenantId', this.tenantId)
            .set('page', (filtros.page ?? 0).toString())
            .set('size', (filtros.size ?? 20).toString());
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.tipoCuenta) params = params.set('tipoCuenta', filtros.tipoCuenta);
        if (filtros.moneda) params = params.set('moneda', filtros.moneda);
        if (filtros.banco) params = params.set('banco', filtros.banco);
        if (filtros.createdAtDesde) params = params.set('createdAtDesde', filtros.createdAtDesde);
        if (filtros.createdAtHasta) params = params.set('createdAtHasta', filtros.createdAtHasta);
        if (filtros.search) params = params.set('search', filtros.search);
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
