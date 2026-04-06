import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    CustomerResponse,
    CustomerRequest,
    CustomerDireccionResponse,
    CustomerDireccionRequest,
    CustomerContactoResponse,
    CustomerContactoRequest,
} from '@features/admin/models/customer.model';

interface PageResponse<T> {
    content: T[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/clientes`;

    /**
     * Obtiene lista paginada de clientes filtrada por empresa
     */
    getAll(
        companyId: number,
        page: number,
        size: number,
        sort: string,
        search?: string
    ): Observable<PageResponse<CustomerResponse>> {
        let params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', sort);

        if (search) {
            params = params.set('search', search);
        }

        return this.http
            .get<PageResponse<CustomerResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtiene un cliente por su ID
     */
    getById(id: number): Observable<CustomerResponse> {
        return this.http
            .get<CustomerResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Crea un nuevo cliente
     */
    create(dto: CustomerRequest): Observable<CustomerResponse> {
        return this.http
            .post<CustomerResponse>(this.baseUrl, dto)
            .pipe(catchError(this.handleError));
    }

    /**
     * Actualiza un cliente existente
     */
    update(id: number, dto: CustomerRequest): Observable<CustomerResponse> {
        return this.http
            .put<CustomerResponse>(`${this.baseUrl}/${id}`, dto)
            .pipe(catchError(this.handleError));
    }

    /**
     * Desactiva (elimina lógicamente) un cliente
     */
    deactivate(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    // ── Direcciones ──────────────────────────────────────────────────────────

    getDirecciones(clienteId: number): Observable<CustomerDireccionResponse[]> {
        return this.http
            .get<CustomerDireccionResponse[]>(`${this.baseUrl}/${clienteId}/direcciones`)
            .pipe(catchError(this.handleError));
    }

    addDireccion(clienteId: number, dto: CustomerDireccionRequest): Observable<CustomerDireccionResponse> {
        return this.http
            .post<CustomerDireccionResponse>(`${this.baseUrl}/${clienteId}/direcciones`, dto)
            .pipe(catchError(this.handleError));
    }

    updateDireccion(
        clienteId: number,
        dirId: number,
        dto: CustomerDireccionRequest
    ): Observable<CustomerDireccionResponse> {
        return this.http
            .put<CustomerDireccionResponse>(`${this.baseUrl}/${clienteId}/direcciones/${dirId}`, dto)
            .pipe(catchError(this.handleError));
    }

    deactivateDireccion(clienteId: number, dirId: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${clienteId}/direcciones/${dirId}`)
            .pipe(catchError(this.handleError));
    }

    // ── Contactos ─────────────────────────────────────────────────────────────

    getContactos(clienteId: number): Observable<CustomerContactoResponse[]> {
        return this.http
            .get<CustomerContactoResponse[]>(`${this.baseUrl}/${clienteId}/contactos`)
            .pipe(catchError(this.handleError));
    }

    addContacto(clienteId: number, dto: CustomerContactoRequest): Observable<CustomerContactoResponse> {
        return this.http
            .post<CustomerContactoResponse>(`${this.baseUrl}/${clienteId}/contactos`, dto)
            .pipe(catchError(this.handleError));
    }

    updateContacto(
        clienteId: number,
        ctId: number,
        dto: CustomerContactoRequest
    ): Observable<CustomerContactoResponse> {
        return this.http
            .put<CustomerContactoResponse>(`${this.baseUrl}/${clienteId}/contactos/${ctId}`, dto)
            .pipe(catchError(this.handleError));
    }

    deactivateContacto(clienteId: number, ctId: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${clienteId}/contactos/${ctId}`)
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Error desconocido';
        if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
        } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Datos inválidos';
        } else if (error.status === 404) {
            errorMessage = 'Cliente no encontrado';
        } else if (error.status === 409) {
            errorMessage = 'Ya existe un cliente con ese documento';
        } else {
            errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
        }

        console.error('CustomerService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
