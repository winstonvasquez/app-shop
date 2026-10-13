import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    CategoryResponse,
    CategoryRequest,
    CategoryFilter,
    MegaMenuCategoriaDto
} from '@core/models/category.model';
import { PageResponse, PaginationConfig } from '@core/models/pagination.model';
import { AuthService } from '@core/auth/auth.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { paramsDeCategorias } from './listados.params';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/categorias`;

    getAll(
        pagination: PaginationConfig,
        filter?: CategoryFilter
    ): Observable<PageResponse<CategoryResponse>> {
        const params = toHttpParams(paramsDeCategorias(pagination, filter));

        return this.http
            .get<PageResponse<CategoryResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    getAllSimple(): Observable<CategoryResponse[]> {
        return this.http
            .get<CategoryResponse[]>(`${this.baseUrl}/all`)
            .pipe(catchError(this.handleError));
    }

    getById(id: number): Observable<CategoryResponse> {
        return this.http
            .get<CategoryResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    getRootCategories(): Observable<CategoryResponse[]> {
        return this.http
            .get<CategoryResponse[]>(`${this.baseUrl}/root`)
            .pipe(catchError(this.handleError));
    }

    create(category: CategoryRequest): Observable<CategoryResponse> {
        return this.http
            .post<CategoryResponse>(this.baseUrl, category)
            .pipe(catchError(this.handleError));
    }

    update(id: number, category: CategoryRequest): Observable<CategoryResponse> {
        return this.http
            .put<CategoryResponse>(`${this.baseUrl}/${id}`, category, { params: this.tenantParams() })
            .pipe(catchError(this.handleError));
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`, { params: this.tenantParams() })
            .pipe(catchError(this.handleError));
    }

    /**
     * Sube la imagen de la categoría; el backend la guarda como binario en la
     * base de datos y devuelve la categoría con la URL del binario servido.
     */
    subirImagen(id: number, archivo: File): Observable<CategoryResponse> {
        const formData = new FormData();
        formData.append('file', archivo);
        return this.http
            .post<CategoryResponse>(`${this.baseUrl}/${id}/imagen`, formData, { params: this.tenantParams() })
            .pipe(catchError(this.handleError));
    }

    /** Elimina la imagen binaria de la categoría. */
    eliminarImagen(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}/imagen`, { params: this.tenantParams() })
            .pipe(catchError(this.handleError));
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }

    search(query: string, pagination: PaginationConfig): Observable<PageResponse<CategoryResponse>> {
        return this.getAll(pagination, { search: query });
    }

    getByLevel(
        nivel: number,
        pagination: PaginationConfig
    ): Observable<PageResponse<CategoryResponse>> {
        return this.getAll(pagination, { nivel });
    }

    getMegaMenu(): Observable<MegaMenuCategoriaDto[]> {
        return this.http
            .get<MegaMenuCategoriaDto[]>(`${this.baseUrl}/megamenu`)
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('CategoryService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, {
            [HTTP_STATUS.notFound]: 'Categoría no encontrada',
        })));
    }
}
