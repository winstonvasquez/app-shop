import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { Page } from '@core/models/pagination.model';
import {
    CrearEvaluacionRequest, EvaluacionProveedor,
    HistorialPrecio, PresupuestoCompras, PuntoReorden
} from '../models/evaluacion.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

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

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            proveedorId: filtros.proveedorId,
            nivel: filtros.nivel,
            periodo: filtros.periodo,
            evaluadoPor: filtros.evaluadoPor,
            createdAtDesde: filtros.createdAtDesde,
            createdAtHasta: filtros.createdAtHasta,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
        });

        return this.http.get<unknown>(`${this.baseUrl}/api/evaluaciones`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => adaptSpringPage<EvaluacionProveedor>(raw, page, size))
        );
    }

    // ── Presupuestos ──────────────────────────────────────────────────────────

    /** El endpoint NO pagina (devuelve List<> completa filtrada). */
    listarPresupuestos(filtros: PresupuestoFiltros = {}): Observable<PresupuestoCompras[]> {
        let params = toHttpParams({
            categoria: filtros.categoria,
            estado: filtros.estado,
            periodo: filtros.periodo,
            periodoDesde: filtros.periodoDesde,
            periodoHasta: filtros.periodoHasta,
        });
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

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            proveedorId: filtros.proveedorId,
            activo: filtros.activo,
            // `soloAlerta` es booleano y `false` significa «no filtrar», no «filtrar por false»:
            // sin este `|| undefined` viajaría `soloAlerta=false` y el backend acotaría de más.
            soloAlerta: filtros.soloAlerta || undefined,
            situacionStock: filtros.situacionStock,
            updatedAtDesde: filtros.updatedAtDesde,
            updatedAtHasta: filtros.updatedAtHasta,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
        });

        return this.http.get<unknown>(`${this.baseUrl}/api/puntos-reorden`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => adaptSpringPage<PuntoReorden>(raw, page, size))
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

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            sku: filtros.sku,
            productoId: filtros.productoId,
            proveedorId: filtros.proveedorId,
            moneda: filtros.moneda,
            fechaReferenciaDesde: filtros.fechaReferenciaDesde,
            fechaReferenciaHasta: filtros.fechaReferenciaHasta,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
        });

        return this.http.get<unknown>(`${this.baseUrl}/api/historial-precios`, { headers: this.getHeaders(), params }).pipe(
            map((raw: unknown) => adaptSpringPage<HistorialPrecio>(raw, page, size))
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
