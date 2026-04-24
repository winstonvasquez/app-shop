import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, catchError } from 'rxjs';
import { environment } from '@env/environment';

interface AnalyticsEventPayload {
    eventType: string;
    userId?: number;
    sessionId: string;
    productId?: number;
    categoryId?: number;
    searchQuery?: string;
    orderId?: string;
    revenue?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Servicio de analytics para tracking de eventos de conversión.
 * Todos los métodos son fire-and-forget y nunca lanzan excepciones.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private readonly http = inject(HttpClient);
    private readonly eventsUrl = `${environment.apiUrls.sales}/api/analytics/events`;
    private readonly sessionId: string;

    constructor() {
        this.sessionId = this.getOrCreateSessionId();
    }

    trackPageView(path: string): void {
        this.track({
            eventType: 'page_view',
            metadata: { path },
        });
    }

    trackProductView(productId: number, productName: string, price: number): void {
        this.track({
            eventType: 'product_view',
            productId,
            revenue: price,
            metadata: { productName, price },
        });
    }

    trackAddToCart(productId: number, productName: string, price: number, quantity: number): void {
        this.track({
            eventType: 'add_to_cart',
            productId,
            revenue: price * quantity,
            metadata: { productName, price, quantity },
        });
    }

    trackBeginCheckout(cartTotal: number, itemCount: number): void {
        this.track({
            eventType: 'begin_checkout',
            revenue: cartTotal,
            metadata: { cartTotal, itemCount },
        });
    }

    trackPurchase(orderId: string, total: number): void {
        this.track({
            eventType: 'purchase',
            orderId,
            revenue: total,
            metadata: { orderId, total },
        });
    }

    trackSearch(query: string, resultsCount: number): void {
        this.track({
            eventType: 'search',
            searchQuery: query,
            metadata: { query, resultsCount },
        });
    }

    private track(event: Omit<AnalyticsEventPayload, 'sessionId'>): void {
        const payload: AnalyticsEventPayload = {
            ...event,
            sessionId: this.sessionId,
        };

        this.http
            .post<void>(this.eventsUrl, payload)
            .pipe(catchError(() => EMPTY))
            .subscribe();
    }

    private getOrCreateSessionId(): string {
        const KEY = 'analytics_session_id';
        try {
            const existing = sessionStorage.getItem(KEY);
            if (existing) return existing;
            const newId = crypto.randomUUID();
            sessionStorage.setItem(KEY, newId);
            return newId;
        } catch {
            return crypto.randomUUID();
        }
    }
}
