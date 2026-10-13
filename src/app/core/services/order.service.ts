import { Injectable, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { HttpClient, HttpParams, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

/** Filtros server-side del listado "Mis pedidos" del storefront. Todos opcionales. */
export interface MisPedidosFiltros {
    /** Busca por id del pedido o serie-número de CPE. */
    search?: string;
    estado?: string;
    cpeTipo?: string;
    cpeEstado?: string;
    metodoPago?: string;
    /** yyyy-MM-dd */
    fechaPedidoDesde?: string;
    /** yyyy-MM-dd */
    fechaPedidoHasta?: string;
}

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/pedidos`;

    /**
     * Pedidos del cliente autenticado (`GET /api/pedidos/mis-pedidos`). TODO el filtrado
     * ocurre en el backend (filtra por userId del JWT) — nunca filtra la página cargada.
     */
    getMisPedidos(
        page: number,
        size: number,
        filtros: MisPedidosFiltros = {}
    ): Observable<PageResponse<OrderResponse>> {
        let params = toHttpParams({
            page,
            size,
            sort: 'fechaPedido,desc',
            search: filtros.search,
            estado: filtros.estado,
            cpeTipo: filtros.cpeTipo,
            cpeEstado: filtros.cpeEstado,
            metodoPago: filtros.metodoPago,
            fechaPedidoDesde: filtros.fechaPedidoDesde,
            fechaPedidoHasta: filtros.fechaPedidoHasta,
        });

        return this.http
            .get<PageResponse<OrderResponse>>(`${this.baseUrl}/mis-pedidos`, { params })
            .pipe(catchError(this.handleError));
    }

    getAll(
        pagination: PaginationConfig,
        search?: string,
        filters?: {
            estado?: string;
            cpeTipo?: string;
            cpeEstado?: string;
            metodoPago?: string;
            estadoPago?: string;
            fechaPedidoDesde?: string;
            fechaPedidoHasta?: string;
            cpeFechaEmisionDesde?: string;
            cpeFechaEmisionHasta?: string;
        }
    ): Observable<PageResponse<OrderResponse>> {
        // El listado de pedidos del admin exige companyId: sin él el backend responde 400 y la
        // tabla queda vacía sin explicación. Los filtros van por spread porque su tipo declara
        // exactamente los parámetros que acepta el endpoint.
        const params = toHttpParams({
            page: pagination.page,
            size: pagination.size,
            companyId: this.auth.currentUser()?.activeCompanyId,
            sort: pagination.sort ? `${pagination.sort.field},${pagination.sort.direction}` : undefined,
            search,
            ...filters,
        });

        return this.http
            .get<PageResponse<OrderResponse>>(this.baseUrl, { params })
            .pipe(catchError(this.handleError));
    }

    getById(id: number): Observable<OrderResponse> {
        return this.http
            .get<OrderResponse>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Crea un pedido. Envía un header `Idempotency-Key` (UUID por intento) para que el
     * backend deduplique ante reintento de red: el mismo key NO crea dos pedidos.
     */
    createOrder(order: OrderRequest, idempotencyKey?: string): Observable<OrderResponse> {
        const headers = idempotencyKey
            ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
            : undefined;
        return this.http
            .post<OrderResponse>(this.baseUrl, order, { headers })
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
        console.error('OrderService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, { [HTTP_STATUS.notFound]: 'Pedido no encontrado' })));
    }
}
