import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { OrdenCompra, OrdenCompraPage } from '../models/orden-compra.model';

@Injectable({ providedIn: 'root' })
export class OrdenCompraService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.purchases}/api/ordenes-compra`;

    getOrdenes(page = 0, size = 10, estado?: string): Observable<OrdenCompraPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (estado) params = params.set('estado', estado);

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
