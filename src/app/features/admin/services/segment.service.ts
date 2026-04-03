import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { SegmentResponse, SegmentRequest } from '@features/admin/models/segment.model';
import { PageResponse } from '@features/admin/models/product.model';

@Injectable({
    providedIn: 'root'
})
export class SegmentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/segments`;

    getAll(page: number, size: number, search?: string): Observable<PageResponse<SegmentResponse>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (search) {
            params = params.set('search', search);
        }

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
        } else if (error.status === 404) {
            message = 'Segmento no encontrado';
        } else if (error.status === 409) {
            message = 'Ya existe un segmento con ese nombre';
        } else {
            message = error.error?.message ?? `Error ${error.status}`;
        }

        console.error('SegmentService Error:', error);
        return throwError(() => new Error(message));
    }
}
