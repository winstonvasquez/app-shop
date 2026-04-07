import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface FlashSale {
    id: number;
    nombre: string;
    descripcion: string;
    tipo: string;
    valor: number;
    segundosRestantes: number;
    stockDisponible: number;
    pctStockRestante: number;
    fechaFinTs: string | null;
}

@Injectable({ providedIn: 'root' })
export class FlashSaleService {
    private http = inject(HttpClient);

    readonly flashSales = signal<FlashSale[]>([]);
    private refreshInterval: ReturnType<typeof setInterval> | null = null;

    loadFlashSales(): void {
        this.http.get<FlashSale[]>(`${environment.apiUrls.sales}/api/v1/promociones/flash-activas`).subscribe({
            next: (data) => this.flashSales.set(data),
            error: () => {}
        });
    }

    /** Inicia polling cada 30s para actualizar los countdowns del servidor. */
    startPolling(): void {
        this.loadFlashSales();
        if (this.refreshInterval) return;
        this.refreshInterval = setInterval(() => this.loadFlashSales(), 30_000);
    }

    stopPolling(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
