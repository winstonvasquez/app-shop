import { inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export abstract class BaseApiService<TCreate, TResponse = TCreate> {
    protected readonly http = inject(HttpClient);
    protected abstract readonly baseUrl: string;

    getAll(params?: HttpParams): Observable<TResponse[]> {
        return this.http.get<TResponse[]>(this.baseUrl, { params })
            .pipe(catchError(this.handleError.bind(this)));
    }

    getPaginated<TPageResponse>(params?: HttpParams): Observable<TPageResponse> {
        return this.http.get<TPageResponse>(this.baseUrl, { params })
            .pipe(catchError(this.handleError.bind(this)));
    }

    getById(id: number | string): Observable<TResponse> {
        return this.http.get<TResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError.bind(this)));
    }

    create(item: TCreate): Observable<TResponse> {
        return this.http.post<TResponse>(this.baseUrl, item)
            .pipe(catchError(this.handleError.bind(this)));
    }

    update(id: number | string, item: TCreate): Observable<TResponse> {
        return this.http.put<TResponse>(`${this.baseUrl}/${id}`, item)
            .pipe(catchError(this.handleError.bind(this)));
    }

    delete(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError.bind(this)));
    }

    protected handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === 400) {
                errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === 401) {
                errorMessage = 'No autorizado';
            } else if (error.status === 403) {
                errorMessage = 'Acceso denegado';
            } else if (error.status === 404) {
                errorMessage = 'Recurso no encontrado';
            } else if (error.status === 409) {
                errorMessage = 'Conflicto: el registro ya existe o está en uso';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
            }
        }

        console.error(`[API Error] ${this.constructor.name}:`, error);
        return throwError(() => new Error(errorMessage));
    }
}
