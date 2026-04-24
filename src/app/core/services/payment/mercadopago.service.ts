import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Datos de tarjeta recopilados por el formulario de pago.
 * NUNCA se envían al backend — solo se usan para generar el token MP.
 */
export interface CardData {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    securityCode: string;
    cardholderName: string;
    cardholderIdType: string;   // DNI | CE | RUC
    cardholderIdNumber: string;
}

/**
 * Resultado de un intento de pago procesado por el backend.
 */
export interface PaymentResult {
    status: 'approved' | 'rejected' | 'pending';
    paymentId: string;
    orderId: number;
    message?: string;
}

/**
 * Resultado de una intención de pago Yape.
 */
export interface YapeIntentResult {
    qrData: string;           // base64 image/svg+xml o image/png
    transactionId: string;
    expiresAt: string;        // ISO datetime
}

/**
 * Estado de una transacción Yape.
 */
export interface YapeStatusResult {
    transactionId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Servicio de integración con MercadoPago.
 *
 * Implementación actual: simulada (sin SDK real instalado).
 *
 * Para integrar el SDK real (@mercadopago/sdk-js):
 * 1. Instalar: npm install @mercadopago/sdk-js
 * 2. Reemplazar createCardToken() con MP Brick Card Payment
 * 3. Reemplazar processYapePayment() con MP Wallet API (wallet_purchase yape)
 *
 * @see https://www.mercadopago.com.pe/developers/es/docs/checkout-bricks/card-payment-brick/introduction
 */
@Injectable({ providedIn: 'root' })
export class MercadoPagoService {

    private readonly http = inject(HttpClient);
    private readonly usersApiBase = environment.apiUrls?.users ?? '/users';
    private readonly salesApiBase = environment.apiUrls?.sales ?? '/sales';

    /** Indica si el SDK MP fue inicializado correctamente. */
    isReady = signal(false);

    /**
     * Obtiene la Public Key de MercadoPago desde los parámetros del sistema.
     * La Public Key es segura para el frontend.
     */
    getPublicKey(): Observable<string> {
        return this.http
            .get<string>(`${this.usersApiBase}/api/system/parameters/MP_PUBLIC_KEY`, {
                responseType: 'text' as 'json'
            })
            .pipe(
                map((key: string) => {
                    // TODO: con SDK real, inicializar aquí:
                    // loadMercadoPago().then(() => {
                    //   const mp = new (window as unknown as { MercadoPago: new (key: string) => unknown }).MercadoPago(key);
                    //   this.isReady.set(true);
                    // });
                    this.isReady.set(true);
                    return key;
                })
            );
    }

    /**
     * Crea un token de tarjeta usando el SDK de MercadoPago Brick.
     *
     * TODO: Reemplazar con la integración real del Card Payment Brick:
     * <code>
     * const bricksBuilder = mp.bricks();
     * const cardPaymentBrickController = await bricksBuilder.create('cardPayment', 'mp-card-brick', {
     *   initialization: { amount },
     *   callbacks: {
     *     onSubmit: async (cardFormData) => {
     *       // cardFormData.token ya contiene el token generado por MP
     *       return this.processPayment(cardFormData.token, amount, orderId, cardFormData.payment_method_id);
     *     },
     *     onError: (error) => console.error(error),
     *   },
     * });
     * </code>
     *
     * @param cardData Datos del formulario de tarjeta (nunca enviar al backend)
     * @returns Observable con el token de tarjeta simulado
     */
    createCardToken(cardData: CardData): Observable<string> {
        // TODO: reemplazar con MP SDK Brick
        const simulatedToken = `SIMULATED_TOKEN_${Date.now()}_${cardData.cardholderName.replace(/\s/g, '_').toUpperCase()}`;
        return of(simulatedToken);
    }

    /**
     * Inicia un pago Yape mediante MercadoPago Wallet API.
     * Devuelve el QR para que el cliente escanee con su app Yape.
     *
     * TODO: Reemplazar con MP wallet_purchase para Yape:
     * <code>
     * const mp = new MercadoPago(publicKey);
     * // Yape se maneja desde el backend con payment_method_id=yape
     * // El frontend solo muestra el QR que retorna el backend.
     * </code>
     *
     * @param amount  Monto a cobrar en soles
     * @param orderId ID del pedido asociado
     * @returns Observable con datos del QR y referencia de transacción
     */
    processYapePayment(amount: number, orderId: number): Observable<YapeIntentResult> {
        return this.http.post<YapeIntentResult>(`${this.salesApiBase}/api/pagos/yape-intent`, {
            amount,
            orderId
        });
    }

    /**
     * Consulta el estado de una transacción Yape (para polling).
     *
     * @param transactionId ID de transacción retornado por crearYapeIntent()
     * @returns Observable con el estado actual
     */
    getYapeStatus(transactionId: string): Observable<YapeStatusResult> {
        return this.http.get<YapeStatusResult>(
            `${this.salesApiBase}/api/pagos/yape-status/${transactionId}`
        );
    }

    /**
     * Envía el token de tarjeta al backend para procesar el pago.
     *
     * @param cardToken     Token generado por MP Brick (nunca datos de tarjeta raw)
     * @param amount        Monto total del pedido
     * @param orderId       ID del pedido
     * @param paymentMethod Código del método (visa, master, etc.)
     * @returns Observable con el resultado del pago
     */
    processCardPayment(
        cardToken: string,
        amount: number,
        orderId: number,
        paymentMethod: string
    ): Observable<PaymentResult> {
        return this.http.post<PaymentResult>(`${this.salesApiBase}/api/pagos/procesar`, {
            cardToken,
            amount,
            orderId,
            paymentMethod
        });
    }
}
