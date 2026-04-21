import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
    OrderResponse,
    OrderRequest,
    OrderStatusUpdate,
    PaymentConfirmResponse,
    OrderCancelResponse
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

    /**
     * Confirma el pago de un pedido PENDIENTE_PAGO.
     * POST /api/pedidos/{orderId}/confirmar-pago
     *
     * @param orderId       ID del pedido creado previamente
     * @param referenciaPago Referencia del gateway (paymentId, transactionId, etc.)
     */
    confirmPayment(orderId: number, referenciaPago: string): Observable<PaymentConfirmResponse> {
        return this.http
            .post<PaymentConfirmResponse>(`${this.baseUrl}/${orderId}/confirmar-pago`, { referenciaPago })
            .pipe(catchError(this.handleError));
    }

    /**
     * Cancela un pedido y restaura el stock en el backend.
     * POST /api/pedidos/{orderId}/cancelar
     *
     * @param orderId ID del pedido a cancelar
     * @param motivo  Razón de cancelación (ej. 'PAGO_FALLIDO', 'TIMEOUT')
     */
    cancelOrder(orderId: number, motivo: string): Observable<OrderCancelResponse> {
        return this.http
            .post<OrderCancelResponse>(`${this.baseUrl}/${orderId}/cancelar`, { motivo })
            .pipe(catchError(this.handleError));
    }

    /**
     * Valida un cupón de descuento contra POST /api/v1/cupones/validate.
     */
    validateCoupon(code: string, subtotal: number = 0): Observable<{ amount: number }> {
        const url = `${environment.apiUrls.sales}/api/v1/cupones/validate`;
        return this.http.post<{ valido: boolean; tipo: string; valor: number; mensaje: string }>(
            url, { codigo: code, subtotal }
        ).pipe(
            catchError(this.handleError),
            (source) => new Observable<{ amount: number }>(observer => {
                source.subscribe({
                    next: (res) => {
                        if (res.valido && res.valor != null) {
                            observer.next({ amount: res.valor });
                            observer.complete();
                        } else {
                            observer.error(new Error(res.mensaje ?? 'Cupón inválido'));
                        }
                    },
                    error: (e: unknown) => observer.error(e),
                    complete: () => observer.complete(),
                });
            })
        );
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
