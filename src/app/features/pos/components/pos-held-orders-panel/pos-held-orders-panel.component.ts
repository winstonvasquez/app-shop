import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { OrdenRetenida } from '../../services/pos-ordenes-retenidas.service';

@Component({
    selector: 'app-pos-held-orders-panel',
    standalone: true,
    templateUrl: './pos-held-orders-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosHeldOrdersPanelComponent {

    readonly ordenes = input.required<OrdenRetenida[]>();

    readonly restore = output<OrdenRetenida>();
    readonly discard = output<OrdenRetenida>();

    onRestore(orden: OrdenRetenida): void {
        this.restore.emit(orden);
    }

    onDiscard(orden: OrdenRetenida): void {
        this.discard.emit(orden);
    }

    countItems(itemsJson: string): number {
        try {
            const items = JSON.parse(itemsJson) as unknown[];
            return items.length;
        } catch {
            return 0;
        }
    }

    formatTotal(itemsJson: string, descuento: number): string {
        try {
            const items = JSON.parse(itemsJson) as Array<{ subtotal?: number }>;
            const sum = items.reduce((s, i) => s + (i.subtotal ?? 0), 0);
            return Math.max(0, sum - (descuento ?? 0)).toFixed(2);
        } catch {
            return '0.00';
        }
    }

    formatTime(iso: string): string {
        const d = new Date(iso);
        return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
}
