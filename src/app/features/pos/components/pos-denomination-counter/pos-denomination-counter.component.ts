import { Component, ChangeDetectionStrategy, output, signal, computed } from '@angular/core';

export interface DenominacionConteo {
    denominacion: number;
    cantidad: number;
}

export interface CierreArqueoData {
    montoCierreContado: number;
    denominaciones: DenominacionConteo[];
}

@Component({
    selector: 'app-pos-denomination-counter',
    standalone: true,
    templateUrl: './pos-denomination-counter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosDenominationCounterComponent {

    readonly confirmed = output<CierreArqueoData>();
    readonly cancel = output<void>();

    readonly billetes = [200, 100, 50, 20, 10];
    readonly monedas = [5, 2, 1, 0.50, 0.20, 0.10];

    private readonly conteos = signal<Map<number, number>>(new Map());

    readonly totalContado = computed(() => {
        let total = 0;
        for (const [denom, qty] of this.conteos()) {
            total += denom * qty;
        }
        return total;
    });

    getCantidad(denom: number): number {
        return this.conteos().get(denom) ?? 0;
    }

    getSubtotal(denom: number): string {
        const qty = this.conteos().get(denom) ?? 0;
        return (denom * qty).toFixed(2);
    }

    setCantidad(denom: number, cantidad: number): void {
        this.conteos.update(map => {
            const newMap = new Map(map);
            newMap.set(denom, Math.max(0, cantidad));
            return newMap;
        });
    }

    onConfirm(): void {
        const denominaciones: DenominacionConteo[] = [];
        for (const [denom, qty] of this.conteos()) {
            if (qty > 0) {
                denominaciones.push({ denominacion: denom, cantidad: qty });
            }
        }
        this.confirmed.emit({
            montoCierreContado: this.totalContado(),
            denominaciones,
        });
    }
}
