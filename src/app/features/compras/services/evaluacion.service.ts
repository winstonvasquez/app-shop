import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { Page } from '@core/models/pagination.model';
import {
    CrearEvaluacionRequest, EvaluacionProveedor,
    HistorialPrecio, PresupuestoCompras, PuntoReorden
} from '../models/evaluacion.model';

/** Filtros server-side del listado general de evaluaciones. Todos opcionales. */
export interface EvaluacionFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto (observaciones / razón social del proveedor). */
    q?: string;
    proveedorId?: string;
    nivel?: string;
    /** YYYY-MM, filtro exacto. */
    periodo?: string;
    evaluadoPor?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

/** Filtros server-side del listado de historial de precios. Todos opcionales y combinables. */
export interface HistorialPrecioFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto (SKU / nombre de producto / razón social proveedor). */
    q?: string;
    sku?: string;
    productoId?: string;
    proveedorId?: string;
    moneda?: string;
    /** yyyy-MM-dd */
    fechaReferenciaDesde?: string;
    /** yyyy-MM-dd */
    fechaReferenciaHasta?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

/** Filtros server-side del listado de puntos de reorden. Todos opcionales. */
export interface PuntoReordenFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto (SKU / nombre de producto). */
    q?: string;
    proveedorId?: string;
    activo?: boolean;
    soloAlerta?: boolean;
    /** Derivado en backend: 'CRITICO' | 'BAJO' | 'NORMAL'. */
    situacionStock?: string;
    /** yyyy-MM-dd */
    updatedAtDesde?: string;
    /** yyyy-MM-dd */
    updatedAtHasta?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

/** Filtros del listado de presupuestos. El endpoint NO pagina (List<>). */
export interface PresupuestoFiltros {
    categoria?: string;
    estado?: string;
    /** Filtro exacto legado (equivale a periodoDesde = periodoHasta = periodo). */
    periodo?: string;
    /** YYYY-MM */
    periodoDesde?: string;
    /** YYYY-MM */
    periodoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = environment.apiUrls.purchases;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    /** Adapta la respuesta cruda de Spring Page (shape flat o nested bajo `page`) a `Page<T>`. */
    private static adaptPage<T>(raw: unknown, page: number, size: number): Page<T> {
        const r = raw as Record<string, unknown>;
        const nested = r['page'] as Record<string, unknown> | undefined;
        return {
            content: (r['content'] as T[]) ?? [],
            totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
            totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
            size: (r['size'] as number) ?? (nested?.['size'] as number) ?? size,
            number: (r['number'] as number) ?? (nested?.['number'] as number) ?? page,
            first: !!(r['first'] as boolean),
            last: !!(r['last'] as boolean),
            empty: !!(r['empty'] as boolean),
        } as Page<T>;
    }

    // ── Evaluaciones ──────────────────────────────────────────────────────────

    crearEvaluacion(request: CrearEvaluacionRequest): Observable<EvaluacionProveedor> {
        return this.http.post<EvaluacionProveedor>(
            `${this.baseUrl}/api/evaluaciones`, request,
            { headers: this.getHeaders() });
    }

    /**
     * Listado general paginado de evaluaciones de TODA la empresa (no requiere elegir
     * proveedor primero). TODO el filtrado ocurre en el backend (`GET /api/evaluaciones`);
     * la vista nunca filtra la página cargada.
     */
    listarEvaluaciones(filtros: EvaluacionFiltros = {}): Observable<Page<EvaluacionProveedor>> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
        if (filtros.nivel) params = params.set('nivel', filtros.nivel);
        if (filtros.periodo) params = params.set('periodo', filtros.periodo);
        if (filtros.evaluadoPor) params = params.set('evaluadoPor', filtros.evaluadoPor);
        if (filtros.createdAtDesde) params = params.set('createdAtDesde', filtros.createdAtDesde);
        if (filtros.createdAtHasta) params = params.set('createdAtHasta', filtros.createdAtHasta);
        if (filtros.sortField) {
            params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        }

        return this.http.get<unknown>(`${this.baseUrl}/api/evaluaciones`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => EvaluacionService.adaptPage<EvaluacionProveedor>(raw, page, size))
        );
    }

    // ── Presupuestos ──────────────────────────────────────────────────────────

    /** El endpoint NO pagina (devuelve List<> completa filtrada). */
    listarPresupuestos(filtros: PresupuestoFiltros = {}): Observable<PresupuestoCompras[]> {
        let params = new HttpParams();
        if (filtros.categoria) params = params.set('categoria', filtros.categoria);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.periodo) params = params.set('periodo', filtros.periodo);
        if (filtros.periodoDesde) params = params.set('periodoDesde', filtros.periodoDesde);
        if (filtros.periodoHasta) params = params.set('periodoHasta', filtros.periodoHasta);
        return this.http.get<PresupuestoCompras[]>(
            `${this.baseUrl}/api/presupuestos`,
            { headers: this.getHeaders(), params });
    }

    crearPresupuesto(periodo: string, categoria: string, montoAsignado: number): Observable<PresupuestoCompras> {
        return this.http.post<PresupuestoCompras>(
            `${this.baseUrl}/api/presupuestos`,
            { periodo, categoria, montoAsignado },
            { headers: this.getHeaders() });
    }

    actualizarEjecucion(id: string, montoEjecutado?: number, montoComprometido?: number): Observable<PresupuestoCompras> {
        return this.http.put<PresupuestoCompras>(
            `${this.baseUrl}/api/presupuestos/${id}/ejecucion`,
            { montoEjecutado, montoComprometido },
            { headers: this.getHeaders() });
    }

    actualizarMontoAsignado(id: string, montoAsignado: number): Observable<PresupuestoCompras> {
        return this.http.put<PresupuestoCompras>(
            `${this.baseUrl}/api/presupuestos/${id}/monto-asignado`,
            { montoAsignado },
            { headers: this.getHeaders() });
    }

    // ── Puntos de Reorden ─────────────────────────────────────────────────────

    /**
     * Listado paginado con filtros avanzados. TODO el filtrado ocurre en el backend
     * (`GET /api/puntos-reorden`); la vista nunca filtra la página cargada.
     */
    listarPuntosReorden(filtros: PuntoReordenFiltros = {}): Observable<Page<PuntoReorden>> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
        if (filtros.activo !== undefined && filtros.activo !== null) params = params.set('activo', String(filtros.activo));
        if (filtros.soloAlerta) params = params.set('soloAlerta', String(filtros.soloAlerta));
        if (filtros.situacionStock) params = params.set('situacionStock', filtros.situacionStock);
        if (filtros.updatedAtDesde) params = params.set('updatedAtDesde', filtros.updatedAtDesde);
        if (filtros.updatedAtHasta) params = params.set('updatedAtHasta', filtros.updatedAtHasta);
        if (filtros.sortField) {
            params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        }

        return this.http.get<unknown>(`${this.baseUrl}/api/puntos-reorden`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => EvaluacionService.adaptPage<PuntoReorden>(raw, page, size))
        );
    }

    listarQueRequierenReorden(): Observable<PuntoReorden[]> {
        return this.http.get<PuntoReorden[]>(
            `${this.baseUrl}/api/puntos-reorden/requieren-reorden`,
            { headers: this.getHeaders() });
    }

    crearPuntoReorden(data: {
        productoId: string; sku: string; productoNombre: string;
        proveedorId?: string; stockMinimo: number; puntoReorden: number; cantidadSugerida: number;
    }): Observable<PuntoReorden> {
        return this.http.post<PuntoReorden>(
            `${this.baseUrl}/api/puntos-reorden`, data,
            { headers: this.getHeaders() });
    }

    actualizarStock(id: string, nuevoStock: number): Observable<PuntoReorden> {
        return this.http.put<PuntoReorden>(
            `${this.baseUrl}/api/puntos-reorden/${id}/stock`,
            { nuevoStock },
            { headers: this.getHeaders() });
    }

    actualizarConfiguracion(id: string, data: {
        stockMinimo?: number; puntoReorden?: number; cantidadSugerida?: number; proveedorId?: string;
        /** null = no tocar; único canal para REACTIVAR un punto de reorden dado de baja. */
        activo?: boolean;
    }): Observable<PuntoReorden> {
        return this.http.put<PuntoReorden>(
            `${this.baseUrl}/api/puntos-reorden/${id}`, data,
            { headers: this.getHeaders() });
    }

    desactivarPuntoReorden(id: string): Observable<void> {
        return this.http.delete<void>(
            `${this.baseUrl}/api/puntos-reorden/${id}`,
            { headers: this.getHeaders() });
    }

    // ── Historial de Precios ──────────────────────────────────────────────────

    /**
     * Listado paginado con búsqueda de texto y filtros combinables (SKU, producto,
     * proveedor, moneda, rango de fecha de referencia). TODO el filtrado ocurre en
     * el backend (`GET /api/historial-precios`); la vista nunca filtra la página cargada.
     */
    listarHistorialPrecios(filtros: HistorialPrecioFiltros = {}): Observable<Page<HistorialPrecio>> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.sku) params = params.set('sku', filtros.sku);
        if (filtros.productoId) params = params.set('productoId', filtros.productoId);
        if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
        if (filtros.moneda) params = params.set('moneda', filtros.moneda);
        if (filtros.fechaReferenciaDesde) params = params.set('fechaReferenciaDesde', filtros.fechaReferenciaDesde);
        if (filtros.fechaReferenciaHasta) params = params.set('fechaReferenciaHasta', filtros.fechaReferenciaHasta);
        if (filtros.sortField) {
            params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        }

        return this.http.get<unknown>(`${this.baseUrl}/api/historial-precios`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => EvaluacionService.adaptPage<HistorialPrecio>(raw, page, size))
        );
    }

    registrarPrecio(data: {
        productoId: string; sku: string; productoNombre: string;
        proveedorId: string; ordenCompraId?: string;
        precioUnitario: number; moneda?: string; fechaReferencia?: string;
    }): Observable<HistorialPrecio> {
        return this.http.post<HistorialPrecio>(
            `${this.baseUrl}/api/historial-precios`, data,
            { headers: this.getHeaders() });
    }
}
