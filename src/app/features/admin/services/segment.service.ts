import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { SegmentResponse, SegmentRequest } from '@features/admin/models/segment.model';
import { PageResponse } from '@core/models/pagination.model';
import { HTTP_STATUS } from '@shared/constants/app.constants';

/** Filtros opcionales para GET /users/api/segments (search + estado + tipo de cliente + rango de fecha). */
export interface SegmentoFiltros {
    page: number;
    size: number;
    search?: string;
    activo?: boolean;
    tipoCliente?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SegmentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/segments`;

    getAll(filtros: SegmentoFiltros): Observable<PageResponse<SegmentResponse>> {
        let params = new HttpParams()
            .set('page', filtros.page.toString())
            .set('size', filtros.size.toString());

        if (filtros.search) params = params.set('search', filtros.search);
        if (filtros.activo !== undefined) params = params.set('activo', String(filtros.activo));
        if (filtros.tipoCliente) params = params.set('tipoCliente', filtros.tipoCliente);
        if (filtros.fechaDesde) params = params.set('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta) params = params.set('fechaHasta', filtros.fechaHasta);

        return this.http
            .get<PageResponse<SegmentResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    getById(id: number): Observable<SegmentResponse> {
        return this.http
            .get<SegmentResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    create(request: SegmentRequest): Observable<SegmentResponse> {
        return this.http
            .post<SegmentResponse>(this.baseUrl, request)
            .pipe(catchError(this.handleError));
    }

    update(id: number, request: SegmentRequest): Observable<SegmentResponse> {
        return this.http
            .put<SegmentResponse>(`${this.baseUrl}/${id}`, request)
            .pipe(catchError(this.handleError));
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let message = 'Error desconocido';

        if (error.status === 0) {
            message = 'No se pudo conectar con el servidor';
        } else if (error.status === HTTP_STATUS.notFound) {
            message = 'Segmento no encontrado';
        } else if (error.status === HTTP_STATUS.conflict) {
            message = 'Ya existe un segmento con ese nombre';
        } else {
            message = error.error?.message ?? `Error ${error.status}`;
        }

        console.error('SegmentService Error:', error);
        return throwError(() => new Error(message));
    }
}
