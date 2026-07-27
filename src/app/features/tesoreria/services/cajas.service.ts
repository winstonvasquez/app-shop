import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '@core/auth/auth.service';
import { CashRegister, Page } from '../models/tesoreria.model';

export interface CajaRequest {
    nombre: string;
    sucursalId?: number;
    saldoInicial?: number;
}

/** Filtros server-side del listado de cajas. Todos opcionales. */
export interface CajaFiltros {
    page?: number;
    size?: number;
    estado?: string;
    moneda?: string;
    /** yyyy-MM-dd */
    fechaAperturaDesde?: string;
    /** yyyy-MM-dd */
    fechaAperturaHasta?: string;
    /** yyyy-MM-dd */
    fechaCierreDesde?: string;
    /** yyyy-MM-dd */
    fechaCierreHasta?: string;
    /** Búsqueda por texto sobre nombre/observaciones. */
    q?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CajasService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private apiUrl = `${environment.apiUrls.treasury}/api/tesoreria/cajas`;

    private get tenantId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    /**
     * Filtros del listado de cajas. TODO el filtrado ocurre en el backend
     * (`GET /treasury/api/tesoreria/cajas`); la vista nunca filtra la página cargada.
     */
    getAll(filtros: CajaFiltros = {}): Observable<Page<CashRegister>> {
        let params = new HttpParams()
            .set('tenantId', this.tenantId.toString())
            .set('page', (filtros.page ?? 0).toString())
            .set('size', (filtros.size ?? 20).toString());
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.moneda) params = params.set('moneda', filtros.moneda);
        if (filtros.fechaAperturaDesde) params = params.set('fechaAperturaDesde', filtros.fechaAperturaDesde);
        if (filtros.fechaAperturaHasta) params = params.set('fechaAperturaHasta', filtros.fechaAperturaHasta);
        if (filtros.fechaCierreDesde) params = params.set('fechaCierreDesde', filtros.fechaCierreDesde);
        if (filtros.fechaCierreHasta) params = params.set('fechaCierreHasta', filtros.fechaCierreHasta);
        if (filtros.q) params = params.set('q', filtros.q);
        return this.http.get<Page<CashRegister>>(this.apiUrl, { params });
    }

    getById(id: number): Observable<CashRegister> {
        return this.http.get<CashRegister>(`${this.apiUrl}/${id}`);
    }

    create(caja: CajaRequest): Observable<CashRegister> {
        return this.http.post<CashRegister>(this.apiUrl, caja);
    }

    open(id: number, saldoInicial: number): Observable<CashRegister> {
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/open`, { saldoInicial });
    }

    close(id: number): Observable<CashRegister> {
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/close`, {});
    }
}
