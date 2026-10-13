import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '@core/auth/auth.service';
import { CashRegister, Page } from '../models/tesoreria.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface CajaRequest {
    tenantId: number;
    nombre: string;
    moneda: string;
    sucursalId?: number;
    saldoInicial?: number;
}

/** PUT /{id} — solo mientras la caja esté CERRADA (ver CashRegisterController.update). */
export interface CajaUpdateRequest {
    nombre?: string;
    moneda?: string;
    observaciones?: string;
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
        let params = toHttpParams({
            tenantId: this.tenantId,
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            estado: filtros.estado,
            moneda: filtros.moneda,
            fechaAperturaDesde: filtros.fechaAperturaDesde,
            fechaAperturaHasta: filtros.fechaAperturaHasta,
            fechaCierreDesde: filtros.fechaCierreDesde,
            fechaCierreHasta: filtros.fechaCierreHasta,
            q: filtros.q,
        });
        return this.http.get<Page<CashRegister>>(this.apiUrl, { params });
    }

    /** El backend exige `tenantId` como query param en GET /{id} (@RequiresTenantAccess). */
    getById(id: number): Observable<CashRegister> {
        const params = new HttpParams().set('tenantId', this.tenantId.toString());
        return this.http.get<CashRegister>(`${this.apiUrl}/${id}`, { params });
    }

    create(caja: CajaRequest): Observable<CashRegister> {
        return this.http.post<CashRegister>(this.apiUrl, caja);
    }

    /** Ruta real del controller: PUT /{id} con tenantId por query param. Backend rechaza si la caja está ABIERTA. */
    update(id: number, req: CajaUpdateRequest): Observable<CashRegister> {
        const params = new HttpParams().set('tenantId', this.tenantId.toString());
        return this.http.put<CashRegister>(`${this.apiUrl}/${id}`, req, { params });
    }

    /** Rutas reales del controller: POST /{id}/abrir y /{id}/cerrar, ambas con tenantId por query param. */
    open(id: number, saldoInicial: number): Observable<CashRegister> {
        const params = new HttpParams().set('tenantId', this.tenantId.toString());
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/abrir`, { saldoInicial }, { params });
    }

    close(id: number, saldoFinal: number): Observable<CashRegister> {
        const params = new HttpParams().set('tenantId', this.tenantId.toString());
        return this.http.post<CashRegister>(`${this.apiUrl}/${id}/cerrar`, { saldoFinal }, { params });
    }
}
