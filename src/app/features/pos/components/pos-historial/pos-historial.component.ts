import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { TurnoCaja } from '../../models/turno-caja.model';
import { CatalogService } from '@core/services/catalog.service';
import {
    FiltrosHistorialCrudos,
    PosHistorialFiltro,
    construirFiltroHistorial,
    hayFiltrosHistorialActivos,
} from './pos-historial.filtros';

export type { PosHistorialFiltro };

@Component({
    selector: 'app-pos-historial',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './pos-historial.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosHistorialComponent {
    readonly catalog = inject(CatalogService);

    readonly items = input.required<VentaPosResponse[]>();
    readonly turno = input<TurnoCaja | null>(null);

    readonly verRecibo = output<VentaPosResponse>();
    readonly reimprimir = output<VentaPosResponse>();
    readonly anular = output<VentaPosResponse>();
    /** Cualquier cambio de búsqueda/filtro avanzado — SIEMPRE recarga desde el backend (nunca filtra `items()`). */
    readonly filtersChanged = output<PosHistorialFiltro>();

    // ── Filtros (server-side) ───────────────────────────────────
    readonly searchQuery = signal('');
    readonly filterEstado = signal('');
    readonly filterMetodoPago = signal('');
    readonly filterTipoCpe = signal('');
    readonly filterMoneda = signal('');
    readonly filterFechaDesde = signal('');
    readonly filterFechaHasta = signal('');

    readonly estadosVenta = this.catalog.options('ESTADO_VENTA_POS');
    readonly metodosPago = this.catalog.options('METODO_PAGO_POS');
    readonly tiposCpe = this.catalog.options('TIPO_CPE');
    readonly monedas = this.catalog.options('MONEDA');

    readonly hasActiveFilters = computed(() => hayFiltrosHistorialActivos(this.filtrosCrudos()));

    /** Lectura de los siete controles de filtro. Leer las señales aquí mantiene la reactividad. */
    private filtrosCrudos(): FiltrosHistorialCrudos {
        return {
            search: this.searchQuery(),
            estado: this.filterEstado(),
            metodoPago: this.filterMetodoPago(),
            tipoCpe: this.filterTipoCpe(),
            moneda: this.filterMoneda(),
            fechaDesde: this.filterFechaDesde(),
            fechaHasta: this.filterFechaHasta(),
        };
    }

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.emitFilters();
    }

    onEstadoChange(value: string): void {
        this.filterEstado.set(value);
        this.emitFilters();
    }

    onMetodoPagoChange(value: string): void {
        this.filterMetodoPago.set(value);
        this.emitFilters();
    }

    onTipoCpeChange(value: string): void {
        this.filterTipoCpe.set(value);
        this.emitFilters();
    }

    onMonedaChange(value: string): void {
        this.filterMoneda.set(value);
        this.emitFilters();
    }

    onFechaDesdeChange(value: string): void {
        this.filterFechaDesde.set(value);
        this.emitFilters();
    }

    onFechaHastaChange(value: string): void {
        this.filterFechaHasta.set(value);
        this.emitFilters();
    }

    /** "Limpiar filtros": resetea todo y emite UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterMetodoPago.set('');
        this.filterTipoCpe.set('');
        this.filterMoneda.set('');
        this.filterFechaDesde.set('');
        this.filterFechaHasta.set('');
        this.emitFilters();
    }

    private emitFilters(): void {
        this.filtersChanged.emit(construirFiltroHistorial(this.filtrosCrudos()));
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    pagoBadgeClass(metodo: string): string {
        const map: Record<string, string> = {
            EFECTIVO: 'badge-pago badge-pago--efectivo',
            TARJETA:  'badge-pago badge-pago--tarjeta',
            YAPE:     'badge-pago badge-pago--yape',
            PLIN:     'badge-pago badge-pago--plin',
        };
        return map[metodo] ?? 'badge-pago';
    }

    ticketPromedio(t: TurnoCaja): string {
        if (!t.totalTransacciones) return '0.00';
        return (t.totalVentas / t.totalTransacciones).toFixed(2);
    }
}
