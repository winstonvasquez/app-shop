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
        if (filter?.nivel !== undefined) {
            params = params.set('nivel', filter.nivel.toString());
        }
        if (filter?.conImagen !== undefined) {
            params = params.set('conImagen', filter.conImagen.toString());
        }
        if (filter?.activo !== undefined) {
            params = params.set('activo', filter.activo.toString());
        }
        if (filter?.padreId !== undefined) {
            params = params.set('padreId', filter.padreId.toString());
        }
        if (filter?.fechaCreacionDesde) {
            params = params.set('fechaCreacionDesde', filter.fechaCreacionDesde);
        }
        if (filter?.fechaCreacionHasta) {
            params = params.set('fechaCreacionHasta', filter.fechaCreacionHasta);
        }

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

    getSubcategories(parentId: number): Observable<CategoryResponse[]> {
        return this.http
            .get<CategoryResponse[]>(`${this.baseUrl}/${parentId}/subcategories`)
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
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === HTTP_STATUS.badRequest) {
                errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === HTTP_STATUS.notFound) {
                errorMessage = 'Categoría no encontrada';
            } else if (error.status === HTTP_STATUS.conflict) {
                errorMessage = 'La categoría ya existe';
            } else if (error.status === HTTP_STATUS.internalServerError) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
            }
        }

        console.error('CategoryService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
