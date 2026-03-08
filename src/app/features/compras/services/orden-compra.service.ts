import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { OrdenCompra, OrdenCompraPage } from '../models/orden-compra.model';

@Injectable({ providedIn: 'root' })
export class OrdenCompraService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/purchases/api/ordenes-compra`;

    getOrdenes(page = 0, size = 20, estado?: string): Observable<OrdenCompraPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get<OrdenCompraPage>(this.baseUrl, { params });
    }

    getOrdenById(id: string): Observable<OrdenCompra> {
        return this.http.get<OrdenCompra>(`${this.baseUrl}/${id}`);
    }

    createOrden(orden: OrdenCompra): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(this.baseUrl, orden);
    }

    aprobarOrden(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/aprobar`, {});
    }

    cancelarOrden(id: string): Observable<OrdenCompra> {
        return this.http.post<OrdenCompra>(`${this.baseUrl}/${id}/cancelar`, {});
    }
}
