import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { OrdenCompra, OrdenCompraPage } from '../models/orden-compra.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

/** Filtros server-side del listado de órdenes de compra. Todos opcionales. */
export interface OrdenCompraFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre código de OC y razón social del proveedor. */
    q?: string;
    estado?: string;
    condicionPago?: string;
    proveedorId?: string;
    moneda?: string;
    /** yyyy-MM-dd */
    fechaEmisionDesde?: string;
    /** yyyy-MM-dd */
    fechaEmisionHasta?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class OrdenCompraService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.purchases}/api/ordenes-compra`;

    /**
     * Filtros del listado de OC. TODO el filtrado ocurre en el backend
     * (`GET /purchases/api/ordenes-compra`); la vista nunca filtra la página cargada.
     */
    getOrdenes(filtros: OrdenCompraFiltros = {}): Observable<OrdenCompraPage> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            condicionPago: filtros.condicionPago,
            proveedorId: filtros.proveedorId,
            moneda: filtros.moneda,
            fechaEmisionDesde: filtros.fechaEmisionDesde,
            fechaEmisionHasta: filtros.fechaEmisionHasta,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
        });

        return this.http.get<unknown>(this.baseUrl, { params }).pipe(
            map((raw: unknown) => adaptSpringPage<OrdenCompra>(raw, page, size) as OrdenCompraPage)
        );
    }

    /**
     * Variante pura (Promise) de `getOrdenes`, pensada para adapters
     * `ServerSelectDataSource` (ver `ordenCompraSelectSource`). No muta ningún
     * signal de estado compartido — solo envuelve la misma llamada HTTP.
     */
    async searchPage(page = 0, size = 10, search?: string): Promise<OrdenCompraPage> {
        return firstValueFrom(this.getOrdenes({ page, size, q: search }));
    }

    getOrdenById(id: string): Observable<OrdenCompra> {
        return this.http.get<OrdenCompra>(`${this.baseUrl}/${id}`);
    }

    createOrden(orden: Partial<OrdenCompra>): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(this.baseUrl, orden);
    }

    updateOrden(id: string, orden: Partial<OrdenCompra>): Observable<OrdenCompra> {
        return this.http.put<OrdenCompra>(`${this.baseUrl}/${id}`, orden);
    }

    aprobarOrden(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/aprobar`, {});
    }

    cancelarOrden(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/cancelar`, {});
    }

    /** Sólo desde RECIBIDA_PARCIALMENTE: la deja RECIBIDA y libera el presupuesto no recibido. X-Company-Id lo pone tenant.interceptor. */
    cerrarSaldo(id: string, motivo?: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/cerrar-saldo`, { motivo });
    }

    enviarAlProveedor(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/enviar`, {});
    }
}
