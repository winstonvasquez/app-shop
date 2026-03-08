import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    OrderResponse,
    OrderRequest,
    OrderStatusUpdate
} from '@core/models/order.model';
import { PageResponse, PaginationConfig } from '@core/models/pagination.model';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/pedidos`;

    getAll(pagination: PaginationConfig): Observable<PageResponse<OrderResponse>> {
        let params = new HttpParams()
            .set('page', pagination.page.toString())
            .set('size', pagination.size.toString());

        if (pagination.sort) {
            params = params.set(
                'sort',
                `${pagination.sort.field},${pagination.sort.direction}`
            );
        }

        return this.http
            .get<PageResponse<OrderResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    getById(id: number): Observable<OrderResponse> {
        return this.http
            .get<OrderResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    createOrder(order: OrderRequest): Observable<OrderResponse> {
        return this.http
            .post<OrderResponse>(this.baseUrl, order)
            .pipe(catchError(this.handleError));
    }

    updateStatus(id: number, update: OrderStatusUpdate): Observable<OrderResponse> {
        return this.http
            .put<OrderResponse>(`${this.baseUrl}/${id}/estado`, update)
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === 400) {
                errorMessage = error.error?.message || 'Datos inválidos';
            } else if (error.status === 404) {
                errorMessage = 'Pedido no encontrado';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor';
            }
        }

        console.error('OrderService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
