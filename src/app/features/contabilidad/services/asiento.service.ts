import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Asiento, AsientoRequest } from '../models/asiento.model';
import { PageResponse } from '@core/models/pagination.model';

/** Línea del Libro Diario (backend: LibroDiarioDto, ronda 2026-07-27). */
export interface LibroDiarioEntry {
    asientoId: string;
    numero: number;
    codigo: string;
    fecha: string;
    glosa: string;
    cuentaCodigo: string;
    cuentaNombre: string;
    debe: number;
    haber: number;
    documentoTipo?: string;
    documentoNumero?: string;
    [key: string]: unknown;
}

/** Filtros server-side del Libro Diario. Todos opcionales excepto periodo. */
export interface LibroDiarioFiltros {
    page?: number;
    size?: number;
    /** yyyy-MM-dd */
    fechaDesde?: string | null;
    /** yyyy-MM-dd */
    fechaHasta?: string | null;
    cuenta?: string | null;
    tipoAsiento?: string | null;
    origen?: string | null;
    estado?: string | null;
    search?: string | null;
}

/** Movimiento del Libro Mayor (backend: LibroMayorDto, ronda 2026-07-27). */
export interface LibroMayorEntry {
    cuentaCodigo: string;
    cuentaNombre: string;
    asientoId: string;
    numero: number;
    fecha: string;
    glosa: string;
    debe: number;
    haber: number;
    saldoAcumulado: number;
    [key: string]: unknown;
}

/** Filtros server-side del Libro Mayor. Todos opcionales excepto periodo (cuenta también opcional: trae todas). */
export interface LibroMayorFiltros {
    page?: number;
    size?: number;
    cuenta?: string | null;
    /** yyyy-MM-dd */
    fechaDesde?: string | null;
    /** yyyy-MM-dd */
    fechaHasta?: string | null;
    tipoAsiento?: string | null;
    origen?: string | null;
    tipoCuenta?: string | null;
    search?: string | null;
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
     * Filtros opcionales: rango de fechas + estado/tipo/origen/cuenta PCGE afectada + búsqueda.
     */
    obtenerAsientos(periodoId: string, options?: {
        page?: number; size?: number;
        fechaDesde?: string; fechaHasta?: string;
        estado?: string; tipo?: string; origen?: string; cuentaId?: string; search?: string;
    }): Observable<PageResponse<Asiento>> {
        let params = new HttpParams().set('periodo', periodoId);
        if (options?.page !== undefined) params = params.set('page', options.page.toString());
        if (options?.size !== undefined) params = params.set('size', options.size.toString());
        if (options?.fechaDesde) params = params.set('fechaDesde', options.fechaDesde);
        if (options?.fechaHasta) params = params.set('fechaHasta', options.fechaHasta);
        if (options?.estado) params = params.set('estado', options.estado);
        if (options?.tipo) params = params.set('tipo', options.tipo);
        if (options?.origen) params = params.set('origen', options.origen);
        if (options?.cuentaId) params = params.set('cuentaId', options.cuentaId);
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

    /**
     * Libro Diario PAGINADO (backend: GET /libro-diario, ronda 2026-07-27).
     * Exige `periodo`; el resto de filtros son opcionales.
     */
    obtenerLibroDiario(periodoId: string, filtros: LibroDiarioFiltros = {}): Observable<PageResponse<LibroDiarioEntry>> {
        let params = new HttpParams().set('periodo', periodoId);
        if (filtros.page !== undefined) params = params.set('page', String(filtros.page));
        if (filtros.size !== undefined) params = params.set('size', String(filtros.size));
        if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
        if (filtros.cuenta) params = params.set('cuenta', filtros.cuenta);
        if (filtros.tipoAsiento) params = params.set('tipoAsiento', filtros.tipoAsiento);
        if (filtros.origen) params = params.set('origen', filtros.origen);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.search) params = params.set('search', filtros.search);
        return this.http.get<PageResponse<LibroDiarioEntry>>(`${this.baseUrl}/libro-diario`, { params });
    }

    /**
     * Libro Mayor PAGINADO (backend: GET /libro-mayor, ronda 2026-07-27).
     * Exige `periodo`; `cuenta` ahora es OPCIONAL (sin ella trae todas las cuentas).
     */
    obtenerLibroMayor(periodoId: string, filtros: LibroMayorFiltros = {}): Observable<PageResponse<LibroMayorEntry>> {
        let params = new HttpParams().set('periodo', periodoId);
        if (filtros.page !== undefined) params = params.set('page', String(filtros.page));
        if (filtros.size !== undefined) params = params.set('size', String(filtros.size));
        if (filtros.cuenta) params = params.set('cuenta', filtros.cuenta);
        if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);
        if (filtros.tipoAsiento) params = params.set('tipoAsiento', filtros.tipoAsiento);
        if (filtros.origen) params = params.set('origen', filtros.origen);
        if (filtros.tipoCuenta) params = params.set('tipoCuenta', filtros.tipoCuenta);
        if (filtros.search) params = params.set('search', filtros.search);
        return this.http.get<PageResponse<LibroMayorEntry>>(`${this.baseUrl}/libro-mayor`, { params });
    }

    obtenerBalanceComprobacion(periodoId: string) {
        return this.http.get<BalanceComprobacion>(`${this.baseUrl}/balance-comprobacion`, {
            params: new HttpParams().set('periodo', periodoId)
        });
    }
}
