import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InventarioStock } from '../models/inventario.model';

@Injectable({
    providedIn: 'root'
})
export class InventarioStockService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.inventory}/api/v1/inventory/stock`;

    getAll(warehouseId?: number, productId?: number, page: number = 0, size: number = 20): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (warehouseId) params = params.set('warehouseId', warehouseId.toString());
        if (productId) params = params.set('productId', productId.toString());

        return this.http.get<any>(this.apiUrl, { params });
    }

    getByProductAndWarehouse(productId: number, warehouseId: number): Observable<InventarioStock> {
        return this.http.get<InventarioStock>(`${this.apiUrl}/product/${productId}/warehouse/${warehouseId}`);
    }
}
