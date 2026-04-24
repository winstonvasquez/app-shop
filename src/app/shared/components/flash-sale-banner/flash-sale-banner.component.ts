import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FlashSaleService, FlashSale } from '@core/services/flash-sale.service';

interface Countdown {
    hours: string;
    minutes: string;
    seconds: string;
}

@Component({
    selector: 'app-flash-sale-banner',
    standalone: true,
    imports: [],
    template: `
        @if (activeFlashSale()) {
        <div class="flash-sale-banner">
            <div class="flash-sale-inner">
                <span class="flash-icon">⚡</span>
                <span class="flash-name">{{ activeFlashSale()!.nombre }}</span>
                <span class="flash-discount">
                    {{ activeFlashSale()!.tipo === 'PORCENTAJE'
                        ? activeFlashSale()!.valor + '% OFF'
                        : 'S/ ' + activeFlashSale()!.valor + ' OFF' }}
                </span>
                <div class="flash-countdown">
                    <span class="countdown-label">Termina en:</span>
                    <div class="countdown-units">
                        <span class="unit">{{ countdown().hours }}<small>h</small></span>
                        <span class="sep">:</span>
                        <span class="unit">{{ countdown().minutes }}<small>m</small></span>
                        <span class="sep">:</span>
                        <span class="unit">{{ countdown().seconds }}<small>s</small></span>
                    </div>
                </div>
                @if (activeFlashSale()!.stockDisponible >= 0) {
                <div class="flash-stock">
                    <div class="stock-bar">
                        <div class="stock-fill"
                            [style.width.%]="activeFlashSale()!.pctStockRestante"></div>
                    </div>
                    <span class="stock-label">
                        {{ activeFlashSale()!.stockDisponible }} disponibles
                    </span>
                </div>
                }
            </div>
        </div>
        }
    `,
    styles: [`
        .flash-sale-banner {
            background: linear-gradient(135deg, var(--color-primary) 0%, #ff6b35 100%);
            color: white;
            padding: 0.5rem 1rem;
            text-align: center;
        }
        .flash-sale-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .flash-icon { font-size: 1.25rem; }
        .flash-name { font-weight: 700; font-size: 0.95rem; }
        .flash-discount {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-weight: 700;
        }
        .flash-countdown { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
        .countdown-units { display: flex; align-items: center; gap: 0.25rem; }
        .unit {
            background: rgba(0,0,0,0.2);
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            font-weight: 700;
            font-size: 1rem;
        }
        .unit small { font-size: 0.6rem; margin-left: 1px; }
        .sep { font-weight: 700; }
        .flash-stock { display: flex; align-items: center; gap: 0.5rem; }
        .stock-bar { width: 80px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 999px; overflow: hidden; }
        .stock-fill { height: 100%; background: #fff; border-radius: 999px; transition: width 0.3s; }
        .stock-label { font-size: 0.75rem; white-space: nowrap; }
    `]
})
export class FlashSaleBannerComponent implements OnInit, OnDestroy {
    private flashSaleService = inject(FlashSaleService);

    activeFlashSale = computed(() => {
        const sales = this.flashSaleService.flashSales();
        return sales.find(s => s.segundosRestantes > 0) ?? null;
    });

    countdown = signal<Countdown>({ hours: '00', minutes: '00', seconds: '00' });
    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private localSecondsLeft = 0;

    ngOnInit(): void {
        this.flashSaleService.startPolling();
        this.startLocalCountdown();
    }

    ngOnDestroy(): void {
        this.flashSaleService.stopPolling();
        this.stopLocalCountdown();
    }

    private startLocalCountdown(): void {
        this.countdownInterval = setInterval(() => {
            const sale = this.activeFlashSale();
            if (!sale) { this.countdown.set({ hours: '00', minutes: '00', seconds: '00' }); return; }

            // Decrease locally each second
            if (this.localSecondsLeft <= 0) this.localSecondsLeft = sale.segundosRestantes;
            else this.localSecondsLeft--;

            const h = Math.floor(this.localSecondsLeft / 3600);
            const m = Math.floor((this.localSecondsLeft % 3600) / 60);
            const s = this.localSecondsLeft % 60;
            this.countdown.set({
                hours:   String(h).padStart(2, '0'),
                minutes: String(m).padStart(2, '0'),
                seconds: String(s).padStart(2, '0'),
            });
        }, 1000);
    }

    private stopLocalCountdown(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}
