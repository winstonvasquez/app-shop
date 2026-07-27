import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { PageResponse } from '@core/models/pagination.model';
import {
    CustomerResponse,
    CustomerRequest,
    CustomerDireccionResponse,
    CustomerDireccionRequest,
    CustomerContactoResponse,
    CustomerContactoRequest,
    CustomerDashboard,
} from '@features/admin/models/customer.model';

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
        search?: string,
        filters?: {
            tipoCliente?: string;
            fechaCreacionDesde?: string;
            fechaCreacionHasta?: string;
        }
    ): Observable<PageResponse<CustomerResponse>> {
        let params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('page', page.toString())
            .set('size', size.toString())
            .set('sort', sort);

        if (search) {
            params = params.set('search', search);
        }
        if (filters?.tipoCliente) {
            params = params.set('tipoCliente', filters.tipoCliente);
        }
        if (filters?.fechaCreacionDesde) {
            params = params.set('fechaCreacionDesde', filters.fechaCreacionDesde);
        }
        if (filters?.fechaCreacionHasta) {
            params = params.set('fechaCreacionHasta', filters.fechaCreacionHasta);
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
     * Busca un cliente por tipo+número de documento exacto (match único).
     * Usado por POS para resolver un DNI/RUC tipeado antes de cobrar.
     * Devuelve null en 404 (no encontrado) en vez de propagar el error.
     */
    findByDocumento(companyId: number, documento: string): Observable<CustomerResponse | null> {
        const params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('documento', documento);
        return this.http
            .get<CustomerResponse>(`${this.baseUrl}/by-documento`, { params })
            .pipe(catchError((err: HttpErrorResponse) =>
                err.status === HTTP_STATUS.notFound ? of(null) : this.handleError(err)));
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
     * Obtiene métricas del dashboard de clientes por empresa
     */
    getDashboard(companyId: number): Observable<CustomerDashboard> {
        return this.http
            .get<CustomerDashboard>(`${this.baseUrl}/dashboard`, {
                params: new HttpParams().set('companyId', companyId.toString())
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Asigna un segmento a múltiples clientes en lote
     */
    bulkAssignSegment(clienteIds: number[], segmentoId: number): Observable<void> {
        let params = new HttpParams().set('segmentoId', segmentoId.toString());
        clienteIds.forEach(id => { params = params.append('clienteIds', id.toString()); });
        return this.http
            .put<void>(`${this.baseUrl}/bulk-segment`, null, { params })
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
        } else if (error.status === HTTP_STATUS.badRequest) {
            errorMessage = error.error?.message || 'Datos inválidos';
        } else if (error.status === HTTP_STATUS.notFound) {
            errorMessage = 'Cliente no encontrado';
        } else if (error.status === HTTP_STATUS.conflict) {
            errorMessage = 'Ya existe un cliente con ese documento';
        } else {
            errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
        }

        console.error('CustomerService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
