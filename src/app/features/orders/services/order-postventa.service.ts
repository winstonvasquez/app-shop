import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { GuestSessionService } from '@core/services/guest-session.service';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

/**
 * `GET /api/pedidos/{id}/tracking`: el envío de logística (ShipmentResponse) o, si no hay datos,
 * `{ estado: 'SIN_DATOS', eventos: [] }`.
 */
export interface PedidoTracking {
    estado?: string;
    status?: string;
    trackingNumber?: string;
    dispatchedAt?: string | null;
    estimatedDeliveryDate?: string | null;
    actualDeliveryDate?: string | null;
}

/** `GET /api/pedidos/{id}/comprobante`: serie y número vienen '' mientras el CPE no se emite. */
export interface PedidoComprobante {
    cpeTipo: string;
    cpeSerie: string;
    cpeNumero: string;
    cpeEstado: string;
    cpeFechaEmision: string | null;
}

/** Cuerpo de `POST /api/productos/reviews` (sólo con sesión y producto ENTREGADO). */
export interface ResenaNueva {
    productoId: number;
    calificacion: number;
    comentario: string;
}

/** Acciones posteriores a la compra sobre un pedido: seguimiento, comprobante y reseña. */
@Injectable({ providedIn: 'root' })
export class OrderPostventaService {
    private readonly http = inject(HttpClient);
    private readonly guest = inject(GuestSessionService);
    private readonly pedidos = `${environment.apiUrls.sales}/api/pedidos`;

    getTracking(id: number): Observable<PedidoTracking> {
        return this.http
            .get<PedidoTracking>(`${this.pedidos}/${id}/tracking`, this.guest.opcionesDe(id))
            .pipe(catchError(this.handleError));
    }

    getComprobante(id: number): Observable<PedidoComprobante> {
        return this.http
            .get<PedidoComprobante>(`${this.pedidos}/${id}/comprobante`, this.guest.opcionesDe(id))
            .pipe(catchError(this.handleError));
    }

    crearResena(resena: ResenaNueva): Observable<unknown> {
        return this.http
            .post<unknown>(`${environment.apiUrls.sales}/api/productos/reviews`, resena)
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        return throwError(() => new Error(mensajeDeErrorHttp(error)));
    }
}
