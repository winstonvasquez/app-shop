import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import {
    CompanyResponse,
    CompanyRequest,
    UserCompanyResponse,
    CompanyUserResponse,
    CompanySubscriptionResponse,
    CompanyModuleResponse
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

    /** Listado paginado server-side (search + active + rango de fecha de creación opcionales). */
    getPaged(
        page: number,
        size: number,
        search?: string,
        active?: boolean | null,
        fechaCreacionDesde?: string | null,
        fechaCreacionHasta?: string | null
    ): Observable<PageResponse<CompanyResponse>> {
        let params: Record<string, string> = { page: String(page), size: String(size) };
        if (search) params['search'] = search;
        if (active !== null && active !== undefined) params['active'] = String(active);
        if (fechaCreacionDesde) params['fechaCreacionDesde'] = fechaCreacionDesde;
        if (fechaCreacionHasta) params['fechaCreacionHasta'] = fechaCreacionHasta;
        return this.http
            .get<PageResponse<CompanyResponse>>(`${this.baseUrl}/paged`, { params })
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
     * Suspende o reactiva una empresa tocando SOLO su estado.
     *
     * Reemplaza al patrón anterior de reenviar el DTO completo por PUT con el flag girado: el backend
     * sobrescribe ocho campos de la empresa, así que cualquier campo que la fila de la lista no
     * llevara se ponía a null — en particular `domain`, del que depende la resolución de tenant del
     * checkout de invitado. Girar el estado no debe poder borrar datos.
     */
    cambiarEstado(id: number, activa: boolean): Observable<CompanyResponse> {
        return this.http
            .patch<CompanyResponse>(`${this.baseUrl}/${id}/estado`, { activa })
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

    getCompanyModules(companyId: number): Observable<CompanyModuleResponse[]> {
        return this.http
            .get<CompanyModuleResponse[]>(`${this.baseUrl}/${companyId}/modules`)
            .pipe(catchError(this.handleError));
    }

    getCompanyUsers(companyId: number): Observable<CompanyUserResponse[]> {
        return this.http
            .get<CompanyUserResponse[]>(`${this.baseUrl}/${companyId}/users`)
            .pipe(catchError(this.handleError));
    }

    getCompanySubscription(companyId: number): Observable<CompanySubscriptionResponse | null> {
        return this.http
            .get<CompanySubscriptionResponse>(`${this.baseUrl}/${companyId}/subscription`)
            .pipe(catchError(() => {
                return [null] as unknown as Observable<CompanySubscriptionResponse | null>;
            }));
    }

    toggleModule(companyId: number, moduleId: number, enabled: boolean): Observable<void> {
        return this.http
            .put<void>(`${this.baseUrl}/${companyId}/modules/${moduleId}`, null, {
                params: { enabled: enabled.toString() }
            })
            .pipe(catchError(this.handleError));
    }

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
            } else if (error.status === HTTP_STATUS.badRequest) {
                errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === HTTP_STATUS.notFound) {
                errorMessage = 'Empresa no encontrada';
            } else if (error.status === HTTP_STATUS.conflict) {
                errorMessage = error.error?.detail || error.error?.message || 'La empresa ya existe o el RUC está duplicado';
            } else if (error.status === HTTP_STATUS.internalServerError) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
            }
        }

        console.error('CompanyService Error:', error);
        return throwError(() => new Error(errorMessage));
    }

    /**
     * Sube el logotipo de la empresa. El backend lo guarda como binario en la
     * base de datos y devuelve la empresa con la URL del binario servido.
     */
    subirLogo(companyId: number, archivo: File): Observable<CompanyResponse> {
        const formData = new FormData();
        formData.append('file', archivo);
        return this.http.post<CompanyResponse>(`${this.baseUrl}/${companyId}/logo`, formData);
    }

    /**
     * Elimina el logotipo de la empresa: el backend borra el binario y sus metadatos.
     */
    eliminarLogo(companyId: number): Observable<CompanyResponse> {
        return this.http.delete<CompanyResponse>(`${this.baseUrl}/${companyId}/logo`);
    }
}
