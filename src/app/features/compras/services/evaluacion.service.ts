import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
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

    getEvaluacionesByProveedor(proveedorId: string): Observable<EvaluacionProveedor[]> {
        return this.http.get<EvaluacionProveedor[]>(
            `${this.baseUrl}/api/evaluaciones/proveedor/${proveedorId}`,
            { headers: this.getHeaders() });
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
