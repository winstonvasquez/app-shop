import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { KardexEntry } from '../models/inventario.model';

@Injectable({
    providedIn: 'root'
})
export class KardexService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}${environment.apiUrls.inventory}/api/v1/inventory/kardex`;

    getKardex(productId: number, warehouseId: number, startDate?: string, endDate?: string): Observable<KardexEntry[]> {
        let params = new HttpParams()
            .set('productId', productId.toString())
            .set('warehouseId', warehouseId.toString());

        if (startDate) params = params.set('startDate', startDate);
        if (endDate) params = params.set('endDate', endDate);

        return this.http.get<KardexEntry[]>(this.apiUrl, { params });
    }
}
