import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ProductResponse, Page, Pageable } from '@core/models/product.model';
import { toHttpParams } from '@core/utils/http-params.util';

@Injectable({
    providedIn: 'root'
})
export class ProductsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.sales;
    private readonly endpoint = `${this.baseUrl}/api/v1/productos`;

    getProducts(pageable: Pageable = { page: 0, size: 20 }, search?: string): Observable<Page<ProductResponse>> {
        let params = toHttpParams({
            page: pageable.page || 0,
            size: pageable.size || 20,
            sort: pageable.sort,
            search,
        });

        return this.http.get<Page<ProductResponse>>(this.endpoint, { params });
    }

    getProductById(id: number): Observable<ProductResponse> {
        return this.http.get<ProductResponse>(`${this.endpoint}/${id}`);
    }

    createProduct(product: Partial<ProductResponse>): Observable<ProductResponse> {
        return this.http.post<ProductResponse>(this.endpoint, product);
    }
}
