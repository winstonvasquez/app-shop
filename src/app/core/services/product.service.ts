import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { ProductResponse } from '@core/models/product.model';
import { PageResponse, PaginationConfig, Page } from '@core/models/pagination.model';
import { BaseApiService } from './base-api.service';

export interface ProductRequest {
    nombre: string;
    descripcion?: string | null;
    precioBase: number;
    marca?: string | null;
    categoriaId?: number;
    companyId?: number;
    categoriaIds?: number[];
    activo?: boolean;
}

export interface ProductFilter {
    search?: string;
    companyId?: number;
    categoriaId?: number;
    minPrice?: number;
    maxPrice?: number;
    marcas?: string[];
}

export interface FiltrosDisponibles {
    marcas: string[];
    precioMin: number;
    precioMax: number;
    atributos: { nombre: string; valores: string[] }[];
}

@Injectable({
    providedIn: 'root'
})
export class ProductService extends BaseApiService<ProductRequest, ProductResponse> {
    protected readonly baseUrl = `${environment.apiUrls.sales}/api/v1/productos`;
    private cache = new Map<string, Observable<Page<ProductResponse>>>();

    getAllProductsFiltered(
        pagination: PaginationConfig,
        filter?: ProductFilter
    ): Observable<PageResponse<ProductResponse>> {
        let params = new HttpParams()
            .set('page', pagination.page.toString())
            .set('size', pagination.size.toString());

        if (pagination.sort) {
            params = params.set(
                'sort',
                `${pagination.sort.field},${pagination.sort.direction}`
            );
        }

        if (filter?.search) {
            params = params.set('search', filter.search);
        }
        if (filter?.companyId) {
            params = params.set('companyId', filter.companyId.toString());
        }
        if (filter?.categoriaId) {
            params = params.set('categoriaId', filter.categoriaId.toString());
        }
        if (filter?.minPrice !== undefined) {
            params = params.set('minPrice', filter.minPrice.toString());
        }
        if (filter?.maxPrice !== undefined) {
            params = params.set('maxPrice', filter.maxPrice.toString());
        }
        if (filter?.marcas?.length) {
            filter.marcas.forEach(m => { params = params.append('marca', m); });
        }

        return this.getPaginated<PageResponse<ProductResponse>>(params);
    }

    getAllCached(page: number, size: number, search?: string): Observable<Page<ProductResponse>> {
        return this.getAllCachedFiltered(page, size, search);
    }

    getAllCachedFiltered(
        page: number,
        size: number,
        search?: string,
        categoriaId?: number | null
    ): Observable<Page<ProductResponse>> {
        const key = `${page}-${size}-${search ?? ''}-${categoriaId ?? ''}`;
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        const pagination: PaginationConfig = { page, size };
        const filter: ProductFilter = {};
        if (search)      filter.search      = search;
        if (categoriaId) filter.categoriaId = categoriaId;
        const request$ = this.getAllProductsFiltered(pagination, filter).pipe(shareReplay(1));
        this.cache.set(key, request$);
        return request$;
    }

    override create(product: ProductRequest): Observable<ProductResponse> {
        this.invalidateCache();
        return super.create(product);
    }

    override update(id: number, product: ProductRequest): Observable<ProductResponse> {
        this.invalidateCache();
        return super.update(id, product);
    }

    override delete(id: number): Observable<void> {
        this.invalidateCache();
        return super.delete(id);
    }

    getFiltrosDisponibles(categoriaId?: number): Observable<FiltrosDisponibles> {
        let params = new HttpParams();
        if (categoriaId) params = params.set('categoriaId', categoriaId.toString());
        return this.http.get<FiltrosDisponibles>(`${this.baseUrl}/filtros-disponibles`, { params });
    }

    search(query: string, pagination: PaginationConfig): Observable<PageResponse<ProductResponse>> {
        return this.getAllProductsFiltered(pagination, { search: query });
    }

    getByCompany(
        companyId: number,
        pagination: PaginationConfig
    ): Observable<PageResponse<ProductResponse>> {
        return this.getAllProductsFiltered(pagination, { companyId });
    }

    getByCategory(
        categoriaId: number,
        pagination: PaginationConfig
    ): Observable<PageResponse<ProductResponse>> {
        return this.getAllProductsFiltered(pagination, { categoriaId });
    }

    invalidateCache(): void {
        this.cache.clear();
    }
}
