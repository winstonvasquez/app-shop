import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { SegmentResponse, SegmentRequest } from '@features/admin/models/segment.model';
import { PageResponse } from '@core/models/pagination.model';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

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
        let params = toHttpParams({
            page: filtros.page,
            size: filtros.size,
            search: filtros.search,
            activo: filtros.activo,
            tipoCliente: filtros.tipoCliente,
            fechaDesde: filtros.fechaDesde,
            fechaHasta: filtros.fechaHasta,
        });

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
        console.error('SegmentService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, {
            [HTTP_STATUS.notFound]: 'Segmento no encontrado',
            [HTTP_STATUS.conflict]: 'Ya existe un segmento con ese nombre',
        })));
    }
}
