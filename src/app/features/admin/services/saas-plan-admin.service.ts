import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface SaasPlanAdmin {
    id: number;
    code: string;
    name: string;
    description: string | null;
    priceMonthly: number;
    priceAnnual: number;
    maxUsers: number;
    moduleCodes: string[];
    isActive: boolean;
}

export interface SaasPlanAdminRequest {
    code: string;
    name: string;
    description: string | null;
    priceMonthly: number;
    priceAnnual: number;
    maxUsers: number;
    moduleCodes: string[];
}

/**
 * CRUD admin de planes SaaS — configuracion GLOBAL de la plataforma (precios, modulos incluidos).
 * Restringido a SUPERADMIN en el backend (SecurityConfig: /users/api/saas/admin/**).
 */
@Injectable({
    providedIn: 'root'
})
export class SaasPlanAdminService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/saas/admin/plans`;

    getAll(): Observable<SaasPlanAdmin[]> {
        return this.http.get<SaasPlanAdmin[]>(this.baseUrl).pipe(catchError(this.handleError));
    }

    create(request: SaasPlanAdminRequest): Observable<SaasPlanAdmin> {
        return this.http.post<SaasPlanAdmin>(this.baseUrl, request).pipe(catchError(this.handleError));
    }

    update(id: number, request: SaasPlanAdminRequest): Observable<SaasPlanAdmin> {
        return this.http.put<SaasPlanAdmin>(`${this.baseUrl}/${id}`, request).pipe(catchError(this.handleError));
    }

    deactivate(id: number): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, null).pipe(catchError(this.handleError));
    }

    activate(id: number): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/${id}/activate`, null).pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocurrió un error desconocido';
        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
        } else {
            errorMessage = error.error?.message || error.error?.detail || `Error ${error.status}`;
        }
        console.error('SaasPlanAdminService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
