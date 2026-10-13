import { inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

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

    /**
     * Mensajes propios del dominio, para las subclases que quieran matizar un estado
     * (`{ 404: 'Cliente no encontrado' }`). Vacío = se usan los textos generales.
     */
    protected readonly mensajesDeError: Readonly<Record<number, string>> = {};

    protected handleError(error: HttpErrorResponse): Observable<never> {
        console.error(`[API Error] ${this.constructor.name}:`, error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, this.mensajesDeError)));
    }
}
