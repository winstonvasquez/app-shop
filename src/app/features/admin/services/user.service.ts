import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    UserResponse,
    UserRequest,
    UserFilter
} from '@features/admin/models/user.model';
import { PageResponse, PaginationConfig } from '@core/models/pagination.model';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/users`;

    /**
     * Get paginated list of users with optional filters
     */
    getAll(
        pagination: PaginationConfig,
        filter?: UserFilter
    ): Observable<PageResponse<UserResponse>> {
        let params = toHttpParams({
            page: pagination.page,
            size: pagination.size,
            sort: pagination.sort ? `${pagination.sort.field},${pagination.sort.direction}` : undefined,
            search: filter?.search,
            rolId: filter?.rolId,
            activo: filter?.activo,
            tipoDocumento: filter?.tipoDocumento,
            fechaCreacionDesde: filter?.fechaCreacionDesde,
            fechaCreacionHasta: filter?.fechaCreacionHasta,
        });

        return this.http
            .get<PageResponse<UserResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    /**
     * Get all users without pagination (for selects/dropdowns)
     */
    getAllSimple(): Observable<UserResponse[]> {
        return this.http
            .get<UserResponse[]>(`${this.baseUrl}/all`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Get user by ID
     */
    getById(id: number): Observable<UserResponse> {
        return this.http
            .get<UserResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Get user by username
     */
    getByUsername(username: string): Observable<UserResponse> {
        return this.http
            .get<UserResponse>(`${this.baseUrl}/username/${username}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Create new user
     */
    create(user: UserRequest): Observable<UserResponse> {
        return this.http
            .post<UserResponse>(this.baseUrl, user)
            .pipe(catchError(this.handleError));
    }

    /**
     * Update existing user
     */
    update(id: number, user: UserRequest): Observable<UserResponse> {
        return this.http
            .put<UserResponse>(`${this.baseUrl}/${id}`, user)
            .pipe(catchError(this.handleError));
    }

    /**
     * Delete user
     */
    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Get users by role
     */
    getByRole(rolId: number): Observable<UserResponse[]> {
        return this.http
            .get<UserResponse[]>(`${this.baseUrl}/by-rol/${rolId}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Handle HTTP errors
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('UserService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, {
            [HTTP_STATUS.notFound]: 'Usuario no encontrado',
            [HTTP_STATUS.conflict]: 'El usuario ya existe (username, email o documento duplicado)',
        })));
    }
}
