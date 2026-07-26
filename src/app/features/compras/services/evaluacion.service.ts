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

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = environment.apiUrls.purchases;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    // ── Evaluaciones ──────────────────────────────────────────────────────────

    crearEvaluacion(request: CrearEvaluacionRequest): Observable<EvaluacionProveedor> {
        return this.http.post<EvaluacionProveedor>(
            `${this.baseUrl}/api/evaluaciones`, request,
            { headers: this.getHeaders() });
    }

    getEvaluacionesByProveedor(proveedorId: string): Observable<Page<EvaluacionProveedor>> {
        return this.http.get<unknown>(
            `${this.baseUrl}/api/evaluaciones/proveedor/${proveedorId}`,
            { headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as EvaluacionProveedor[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? 0,
                    number: (r['number'] as number) ?? 0,
                    first: !!(r['first'] as boolean),
                    last: !!(r['last'] as boolean),
                    empty: !!(r['empty'] as boolean),
                } as Page<EvaluacionProveedor>;
            })
        );
    }

    // ── Presupuestos ──────────────────────────────────────────────────────────

    listarPresupuestos(periodo?: string): Observable<PresupuestoCompras[]> {
        let params = new HttpParams();
        if (periodo) params = params.set('periodo', periodo);
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

    listarPuntosReorden(): Observable<PuntoReorden[]> {
        return this.http.get<PuntoReorden[]>(
            `${this.baseUrl}/api/puntos-reorden`,
            { headers: this.getHeaders() });
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

    getHistorialBySku(sku: string): Observable<HistorialPrecio[]> {
        const params = new HttpParams().set('sku', sku);
        return this.http.get<HistorialPrecio[]>(
            `${this.baseUrl}/api/historial-precios`,
            { headers: this.getHeaders(), params });
    }

    getHistorialByProducto(productoId: string): Observable<HistorialPrecio[]> {
        const params = new HttpParams().set('productoId', productoId);
        return this.http.get<HistorialPrecio[]>(
            `${this.baseUrl}/api/historial-precios`,
            { headers: this.getHeaders(), params });
    }

    getHistorialByProveedor(proveedorId: string): Observable<HistorialPrecio[]> {
        const params = new HttpParams().set('proveedorId', proveedorId);
        return this.http.get<HistorialPrecio[]>(
            `${this.baseUrl}/api/historial-precios`,
            { headers: this.getHeaders(), params });
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
