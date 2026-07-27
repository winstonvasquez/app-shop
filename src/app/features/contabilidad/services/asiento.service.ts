import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Asiento, AsientoRequest } from '../models/asiento.model';
import { PageResponse } from '@core/models/pagination.model';

export interface LibroDiarioEntry {
    fecha: string;
    numero: string;
    glosa: string;
    debe: number;
    haber: number;
    [key: string]: unknown;
}

export interface LibroMayorEntry {
    cuenta: string;
    codigoCuenta: string;
    debe: number;
    haber: number;
    saldo: number;
    [key: string]: unknown;
}

export interface BalanceComprobacion {
    cuentas: LibroMayorEntry[];
    totalDebe: number;
    totalHaber: number;
    [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AsientoService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad`;

    crearAsiento(asiento: AsientoRequest) {
        return this.http.post<Asiento>(`${this.baseUrl}/asientos`, asiento);
    }

    /**
     * Listado PAGINADO de asientos (backend: GET /asientos, ronda 2026-07-27).
     * Filtros opcionales: rango de fechas + estado/tipo/origen (enums del backend).
     */
    obtenerAsientos(periodoId: string, options?: {
        page?: number; size?: number;
        fechaDesde?: string; fechaHasta?: string;
        estado?: string; tipo?: string; origen?: string; search?: string;
    }): Observable<PageResponse<Asiento>> {
        let params = new HttpParams().set('periodo', periodoId);
        if (options?.page !== undefined) params = params.set('page', options.page.toString());
        if (options?.size !== undefined) params = params.set('size', options.size.toString());
        if (options?.fechaDesde) params = params.set('fechaDesde', options.fechaDesde);
        if (options?.fechaHasta) params = params.set('fechaHasta', options.fechaHasta);
        if (options?.estado) params = params.set('estado', options.estado);
        if (options?.tipo) params = params.set('tipo', options.tipo);
        if (options?.origen) params = params.set('origen', options.origen);
        if (options?.search) params = params.set('search', options.search);
        return this.http.get<PageResponse<Asiento>>(`${this.baseUrl}/asientos`, { params });
    }

    obtenerAsiento(id: string) {
        return this.http.get<Asiento>(`${this.baseUrl}/asientos/${id}`);
    }

    cerrarAsiento(id: string) {
        return this.http.put<void>(`${this.baseUrl}/asientos/${id}/cerrar`, {});
    }

    extornarAsiento(id: string, motivo: string) {
        return this.http.post<Asiento>(`${this.baseUrl}/asientos/${id}/extorno`, { motivo });
    }

    anularAsiento(id: string, motivo: string) {
        return this.http.put<Asiento>(`${this.baseUrl}/asientos/${id}/anular`, { motivo });
    }

    obtenerLibroDiario(periodoId: string, fechaDesde?: string | null, fechaHasta?: string | null) {
        let params = new HttpParams().set('periodo', periodoId);
        if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
        if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
        return this.http.get<LibroDiarioEntry[]>(`${this.baseUrl}/libro-diario`, { params });
    }

    obtenerLibroMayor(periodoId: string, cuentaId?: string) {
        let params = new HttpParams().set('periodo', periodoId);
        if (cuentaId) params = params.set('cuenta', cuentaId);
        return this.http.get<LibroMayorEntry[]>(`${this.baseUrl}/libro-mayor`, { params });
    }

    obtenerBalanceComprobacion(periodoId: string) {
        return this.http.get<BalanceComprobacion>(`${this.baseUrl}/balance-comprobacion`, {
            params: new HttpParams().set('periodo', periodoId)
        });
    }
}
