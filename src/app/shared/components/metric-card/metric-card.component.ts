import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MetricCardData {
    label: string;
    value: string | number;
    change?: number;       // porcentaje, positivo=sube, negativo=baja
    changeLabel?: string;
    icon?: string;         // nombre del ícono lucide (opcional)
}

@Component({
    selector: 'app-metric-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
        <div class="card-metric">
            <div class="flex items-start justify-between">
                <span class="card-metric-label">{{ data().label }}</span>
            </div>
            <span class="card-metric-value">{{ data().value }}</span>
            @if (data().change !== undefined) {
                <div class="card-metric-change" [class]="changeClass()">
                    @if (data().change! > 0) { <span>↑</span> }
                    @else if (data().change! < 0) { <span>↓</span> }
                    <span>{{ data().changeLabel ?? (data().change! > 0 ? '+' : '') + data().change + '%' }}</span>
                </div>
            }
        </div>
    `
})
export class MetricCardComponent {
    data = input.required<MetricCardData>();

    changeClass() {
        const change = this.data().change;
        if (change === undefined) return '';
        if (change > 0) return 'positive';
        if (change < 0) return 'negative';
        return 'neutral';
    }
}
