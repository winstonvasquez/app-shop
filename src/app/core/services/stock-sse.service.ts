import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@env/environment';

export interface StockUpdate {
    varianteId: number;
    productoId: number;
    sku: string;
    stock: number;
}

/**
 * Servicio SSE para recibir actualizaciones de stock en tiempo real.
 * Se suscribe al endpoint GET /api/v1/stock/events del backend.
 */
@Injectable({ providedIn: 'root' })
export class StockSseService {
    private eventSource: EventSource | null = null;
    private stockMap = signal<Map<number, number>>(new Map());

    readonly stockByVarianteId = this.stockMap.asReadonly();

    connect(): void {
        if (this.eventSource) return;
        const url = `${environment.apiUrls.sales}/api/v1/stock/events`;
        try {
            this.eventSource = new EventSource(url);
            this.eventSource.addEventListener('stock-update', (event) => {
                try {
                    const data: StockUpdate = JSON.parse((event as MessageEvent).data);
                    this.stockMap.update(m => {
                        const newMap = new Map(m);
                        newMap.set(data.varianteId, data.stock);
                        return newMap;
                    });
                } catch {
                    // ignorar payload malformado
                }
            });
            this.eventSource.onerror = () => {
                this.disconnect();
            };
        } catch {
            // EventSource no disponible (ej. SSR)
        }
    }

    disconnect(): void {
        this.eventSource?.close();
        this.eventSource = null;
    }

    getStock(varianteId: number): number | null {
        return this.stockMap().get(varianteId) ?? null;
    }
}
