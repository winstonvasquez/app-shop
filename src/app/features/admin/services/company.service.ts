import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    CompanyResponse,
    CompanyRequest,
    UserCompanyResponse
} from '@features/admin/models/company.model';

@Injectable({
    providedIn: 'root'
})
export class CompanyService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/companies`;
    private readonly userCompanyUrl = `${environment.apiUrls.users}/api/user-companies`;

    /**
     * Get all companies (no pagination in backend)
     */
    getAll(): Observable<CompanyResponse[]> {
        return this.http
            .get<CompanyResponse[]>(this.baseUrl)
            .pipe(catchError(this.handleError));
    }

    /**
     * Get company by ID
     */
    getById(id: number): Observable<CompanyResponse> {
        return this.http
            .get<CompanyResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Create new company
     */
    create(company: CompanyRequest): Observable<CompanyResponse> {
        return this.http
            .post<CompanyResponse>(this.baseUrl, company)
            .pipe(catchError(this.handleError));
    }

    /**
     * Update existing company
     */
    update(id: number, company: CompanyRequest): Observable<CompanyResponse> {
        return this.http
            .put<CompanyResponse>(`${this.baseUrl}/${id}`, company)
            .pipe(catchError(this.handleError));
    }

    /**
     * Delete company
     */
    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Get active companies only
     */
    getActiveCompanies(): Observable<CompanyResponse[]> {
        return this.http
            .get<CompanyResponse[]>(this.baseUrl)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Assign user to company with role
     */
    assignUserToCompany(userId: number, companyId: number, roleId: number): Observable<void> {
        return this.http
            .post<void>(`${this.userCompanyUrl}/assign`, null, {
                params: {
                    userId: userId.toString(),
                    companyId: companyId.toString(),
                    roleId: roleId.toString()
                }
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Get companies for a specific user
     */
    getUserCompanies(userId: number): Observable<UserCompanyResponse[]> {
        return this.http
            .get<UserCompanyResponse[]>(`${this.userCompanyUrl}/user/${userId}`)
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
                errorMessage = 'Empresa no encontrada';
            } else if (error.status === 409) {
                errorMessage = 'La empresa ya existe o el RUC está duplicado';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
            }
        }

        console.error('CompanyService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
