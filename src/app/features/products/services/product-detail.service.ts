import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { environment } from '@env/environment';

@Injectable({
    providedIn: 'root'
})
export class ProductDetailService {
    private http = inject(HttpClient);
    private readonly endpoint = `${environment.apiUrls.sales}/api/v1/products`;

    getProductDetail(id: number | string): Observable<ProductDetail> {
        return this.http.get<ProductDetail>(`${this.endpoint}/${id}/detail`);
    }
}
