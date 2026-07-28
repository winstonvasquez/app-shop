import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { OrdenCompra, OrdenCompraPage } from '../models/orden-compra.model';

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

        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filtros.q) params = params.set('q', filtros.q);
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.condicionPago) params = params.set('condicionPago', filtros.condicionPago);
        if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
        if (filtros.moneda) params = params.set('moneda', filtros.moneda);
        if (filtros.fechaEmisionDesde) params = params.set('fechaEmisionDesde', filtros.fechaEmisionDesde);
        if (filtros.fechaEmisionHasta) params = params.set('fechaEmisionHasta', filtros.fechaEmisionHasta);
        if (filtros.sortField) {
            params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        }

        return this.http.get<unknown>(this.baseUrl, { params }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as OrdenCompra[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as OrdenCompraPage;
            })
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

    enviarAlProveedor(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/enviar`, {});
    }
}
