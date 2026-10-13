import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { ProductResponse } from '@core/models/product.model';
import { PageResponse, PaginationConfig, Page } from '@core/models/pagination.model';
import { BaseApiService } from './base-api.service';
import { AuthService } from '@core/auth/auth.service';
import { toHttpParams } from '@core/utils/http-params.util';
import { paramsDeProductos } from './listados.params';

/** Imagen de producto guardada como binario en la base de datos. */
export interface ProductoImagen {
    id: number;
    /** Ruta del binario servido por el backend: /api/v1/productos/imagenes/{id}/contenido */
    url: string;
    esPrincipal: boolean;
    orden: number;
}

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
    /** OJO: el backend espera `precioMin`/`precioMax` (ProductoController.getAll), NO `minPrice`/`maxPrice`. */
    precioMin?: number;
    precioMax?: number;
    marcas?: string[];
    minRating?: number;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
    /** Por defecto el backend solo devuelve productos activos; mandar `false` para ver inactivos. */
    activo?: boolean;
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
    private readonly auth = inject(AuthService);
    protected readonly baseUrl = `${environment.apiUrls.sales}/api/v1/productos`;
    private cache = new Map<string, Observable<Page<ProductResponse>>>();

    getAllProductsFiltered(
        pagination: PaginationConfig,
        filter?: ProductFilter
    ): Observable<PageResponse<ProductResponse>> {
        return this.getPaginated<PageResponse<ProductResponse>>(
            toHttpParams(paramsDeProductos(pagination, filter)));
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
        const key = `${this.auth.currentUser()?.activeCompanyId ?? ''}-${page}-${size}-${search ?? ''}-${categoriaId ?? ''}`;
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

    /**
     * El PUT del backend exige `companyId` como query param (`@RequestParam`, no en el
     * body), así que el `update` genérico de la clase base devolvía 400 «Parámetro
     * requerido ausente: companyId» y **no se podía editar ningún producto**.
     */
    override update(id: number, product: ProductRequest): Observable<ProductResponse> {
        this.invalidateCache();
        return this.http.put<ProductResponse>(`${this.baseUrl}/${id}`, product, {
            params: this.tenantParams(),
        });
    }

    /** Mismo caso que `update`: el DELETE exige `companyId` como query param. */
    override delete(id: number): Observable<void> {
        this.invalidateCache();
        return this.http.delete<void>(`${this.baseUrl}/${id}`, { params: this.tenantParams() });
    }

    // ── Imágenes del producto (binarias, guardadas en la base de datos) ──────

    /** Metadatos de las imágenes del producto (sin el binario). */
    getImagenes(productoId: number): Observable<ProductoImagen[]> {
        return this.http.get<ProductoImagen[]>(`${this.baseUrl}/${productoId}/imagenes`);
    }

    /** Sube una imagen nueva al producto. El binario queda en la base de datos. */
    subirImagen(productoId: number, archivo: File, esPrincipal = false, orden?: number): Observable<ProductoImagen> {
        const formData = new FormData();
        formData.append('file', archivo);
        let params = this.tenantParams().set('esPrincipal', String(esPrincipal));
        if (orden !== undefined) params = params.set('orden', String(orden));
        this.invalidateCache();
        return this.http.post<ProductoImagen>(`${this.baseUrl}/${productoId}/imagenes`, formData, { params });
    }

    /** Marca una imagen ya guardada como principal; devuelve la galería completa. */
    marcarImagenPrincipal(productoId: number, imagenId: number): Observable<ProductoImagen[]> {
        this.invalidateCache();
        return this.http.patch<ProductoImagen[]>(
            `${this.baseUrl}/${productoId}/imagenes/${imagenId}/principal`, null,
            { params: this.tenantParams() });
    }

    /**
     * Persiste el orden de la galería. El backend exige el conjunto COMPLETO de ids
     * del producto (no acepta reordenar parcialmente) y devuelve la galería ya ordenada.
     */
    reordenarImagenes(productoId: number, imagenIds: number[]): Observable<ProductoImagen[]> {
        this.invalidateCache();
        return this.http.put<ProductoImagen[]>(
            `${this.baseUrl}/${productoId}/imagenes/orden`, { imagenIds },
            { params: this.tenantParams() });
    }

    /** Elimina una imagen del producto; si era la principal, el backend promueve otra. */
    eliminarImagen(productoId: number, imagenId: number): Observable<void> {
        this.invalidateCache();
        return this.http.delete<void>(`${this.baseUrl}/${productoId}/imagenes/${imagenId}`, {
            params: this.tenantParams(),
        });
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }

    getFiltrosDisponibles(categoriaId?: number): Observable<FiltrosDisponibles> {
        let params = toHttpParams({
            categoriaId,
        });
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
