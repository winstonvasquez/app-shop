import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventarioPage, InventarioFilter } from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api/logistica/inventario';

    getInventario(companyId: string, filter: InventarioFilter = {}): Observable<InventarioPage> {
        let params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(filter.page ?? 0))
            .set('size', String(filter.size ?? 10));

        if (filter.almacenId) {
            params = params.set('almacenId', filter.almacenId);
        }
        if (filter.busqueda) {
            params = params.set('busqueda', filter.busqueda);
        }

        return this.http.get<InventarioPage>(this.baseUrl, { params });
    }
}
