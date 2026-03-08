import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    UserResponse,
    UserRequest,
    UserFilter
} from '@features/admin/models/user.model';
import { PageResponse, PaginationConfig } from '@features/admin/models/product.model';

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
        let params = new HttpParams()
            .set('page', pagination.page.toString())
            .set('size', pagination.size.toString());

        // Add sorting
        if (pagination.sort) {
            params = params.set(
                'sort',
                `${pagination.sort.field},${pagination.sort.direction}`
            );
        }

        // Note: Backend filters would need to be implemented
        // For now, we'll filter on the client side if needed

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
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === 400) {
                errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === 404) {
                errorMessage = 'Usuario no encontrado';
            } else if (error.status === 409) {
                errorMessage = 'El usuario ya existe (username, email o documento duplicado)';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
            }
        }

        console.error('UserService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
