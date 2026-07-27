import { Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { TurnoCaja } from '../../models/turno-caja.model';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

/** Sucursal activa de la empresa (para el select de filtro). */
interface SucursalOption {
    id: number;
    nombre: string;
}

/** Filtros server-side del historial de ventas del turno — ver GET /api/pos/turno/{id}/historial. */
export interface PosHistorialFiltro {
    search?: string;
    estado?: string;
    metodoPago?: string;
    tipoCpe?: string;
    moneda?: string;
    sucursalId?: number;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

@Component({
    selector: 'app-pos-historial',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './pos-historial.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosHistorialComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
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
    readonly filterSucursalId = signal('');
    readonly filterFechaDesde = signal('');
    readonly filterFechaHasta = signal('');

    readonly estadosVenta = this.catalog.options('ESTADO_VENTA_POS');
    readonly metodosPago = this.catalog.options('METODO_PAGO_POS');
    readonly tiposCpe = this.catalog.options('TIPO_CPE');
    readonly monedas = this.catalog.options('MONEDA');
    readonly sucursales = signal<SucursalOption[]>([]);

    readonly hasActiveFilters = computed(() =>
        !!(this.searchQuery() || this.filterEstado() || this.filterMetodoPago() || this.filterTipoCpe()
            || this.filterMoneda() || this.filterSucursalId() || this.filterFechaDesde() || this.filterFechaHasta())
    );

    ngOnInit(): void {
        const companyId = this.auth.currentUser()?.activeCompanyId;
        if (!companyId) return;
        this.http.get<SucursalOption[]>(`${environment.apiUrls.pos}/sucursales`, {
            params: { companyId: companyId.toString() }
        }).subscribe({
            next: list => this.sucursales.set(list ?? []),
            error: () => this.sucursales.set([]),
        });
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

    onSucursalChange(value: string): void {
        this.filterSucursalId.set(value);
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
        this.filterSucursalId.set('');
        this.filterFechaDesde.set('');
        this.filterFechaHasta.set('');
        this.emitFilters();
    }

    private emitFilters(): void {
        this.filtersChanged.emit({
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            metodoPago: this.filterMetodoPago() || undefined,
            tipoCpe: this.filterTipoCpe() || undefined,
            moneda: this.filterMoneda() || undefined,
            sucursalId: this.filterSucursalId() ? Number(this.filterSucursalId()) : undefined,
            fechaCreacionDesde: this.filterFechaDesde() || undefined,
            fechaCreacionHasta: this.filterFechaHasta() || undefined,
        });
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
