import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InventarioMovimiento } from '../models/inventario.model';

@Injectable({
    providedIn: 'root'
})
export class InventarioMovimientoService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.inventory}/api/v1/inventory/movements`;

    getAll(warehouseId?: number, productId?: number, page: number = 0, size: number = 20): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (warehouseId) params = params.set('warehouseId', warehouseId.toString());
        if (productId) params = params.set('productId', productId.toString());

        return this.http.get<any>(this.apiUrl, { params });
    }

    getById(id: number): Observable<InventarioMovimiento> {
        return this.http.get<InventarioMovimiento>(`${this.apiUrl}/${id}`);
    }

    create(movement: InventarioMovimiento): Observable<InventarioMovimiento> {
        return this.http.post<InventarioMovimiento>(this.apiUrl, movement);
    }
}
