import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { OrdenCompra } from '../../models/orden-compra.model';
import { OrdenCompraService } from '../../services/orden-compra.service';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { proveedorSelectSource } from '../../components/select-sources';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { PAGINATION } from '@shared/constants/app.constants';

interface KanbanColumna {
    estado: string;
    label: string;
    color: string;
    ordenes: OrdenCompra[];
}

@Component({
    selector: 'app-kanban-ordenes',
    standalone: true,
    imports: [
        DecimalPipe,
        FormsModule,
        ButtonComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        DateInputComponent
    ],
    templateUrl: './kanban-ordenes.component.html',
    styleUrl: './kanban-ordenes.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanOrdenesComponent implements OnInit {
    private ocService = inject(OrdenCompraService);
    private authService = inject(AuthService);
    private proveedorService = inject(ProveedorService);

    cargando = signal(false);
    error = signal('');
    enviandoId = signal<string | null>(null);

    // Filtros server-side del kanban (el estado NO es un filtro: es la dimensión de las columnas)
    searchQuery = signal('');
    filterProveedorId = signal('');
    filterCondicionPago = signal('');
    filterMoneda = signal('');
    filterFechaEmisionDesde = signal<string | null>(null);
    filterFechaEmisionHasta = signal<string | null>(null);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);
    /** Data source para <app-server-search-select> de proveedor (búsqueda por nombre/RUC). */
    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    /** true si hay algún filtro activo distinto del default (para mostrar el botón "Limpiar"). */
    hasFiltrosActivos = signal(false);

    columnas = signal<KanbanColumna[]>([
        { estado: 'BORRADOR',                label: 'Borrador',               color: 'badge-neutral',  ordenes: [] },
        { estado: 'PENDIENTE',               label: 'Pend. Aprobación',        color: 'badge-warning',  ordenes: [] },
        { estado: 'APROBADA',                label: 'Aprobada',               color: 'badge-accent',   ordenes: [] },
        { estado: 'ENVIADA',                 label: 'Enviada',                color: 'badge-success',  ordenes: [] },
        { estado: 'RECIBIDA_PARCIALMENTE',   label: 'Recibida Parcial',       color: 'badge-warning',  ordenes: [] },
        { estado: 'RECIBIDA',                label: 'Recibida',               color: 'badge-success',  ordenes: [] },
    ]);

    ngOnInit(): void {
        this.cargarTodas();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    /**
     * Trae TODAS las OC que matcheen los filtros vigentes (agrupadas en memoria por
     * columna del kanban). El filtrado en sí (proveedor/cond. pago/moneda/fecha/búsqueda)
     * ocurre siempre en el backend — acá solo se agrupa por estado para pintar columnas.
     */
    cargarTodas(): void {
        this.cargando.set(true);
        this.ocService.getOrdenes({
            page: 0,
            size: 200,
            q: this.searchQuery() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            moneda: this.filterMoneda() || undefined,
            fechaEmisionDesde: this.filterFechaEmisionDesde() || undefined,
            fechaEmisionHasta: this.filterFechaEmisionHasta() || undefined
        }).subscribe({
            next: (page) => {
                const mapa = new Map<string, OrdenCompra[]>();
                for (const oc of page.content) {
                    const lista = mapa.get(oc.estado) ?? [];
                    lista.push(oc);
                    mapa.set(oc.estado, lista);
                }
                this.columnas.update(cols =>
                    cols.map(c => ({ ...c, ordenes: mapa.get(c.estado) ?? [] }))
                );
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('Error al cargar órdenes');
                this.cargando.set(false);
            }
        });
    }

    /** Actualiza el término tipeado sin recargar (evita 1 request por tecla). */
    onSearchInput(term: string): void {
        this.searchQuery.set(term);
    }

    /** Dispara la búsqueda server-side: Enter, blur o limpiar. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    onFilterProveedorChange(value: string | number | null): void {
        this.filterProveedorId.set(value != null ? String(value) : '');
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    onFilterCondicionPagoChange(value: string): void {
        this.filterCondicionPago.set(value);
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    onFilterMonedaChange(value: string): void {
        this.filterMoneda.set(value);
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    onFechaDesdeChange(value: string): void {
        this.filterFechaEmisionDesde.set(value || null);
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    onFechaHastaChange(value: string): void {
        this.filterFechaEmisionHasta.set(value || null);
        this.actualizarHasFiltros();
        this.cargarTodas();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterProveedorId.set('');
        this.filterCondicionPago.set('');
        this.filterMoneda.set('');
        this.filterFechaEmisionDesde.set(null);
        this.filterFechaEmisionHasta.set(null);
        this.hasFiltrosActivos.set(false);
        this.cargarTodas();
    }

    private actualizarHasFiltros(): void {
        this.hasFiltrosActivos.set(
            !!this.searchQuery() || !!this.filterProveedorId() || !!this.filterCondicionPago() ||
            !!this.filterMoneda() || !!this.filterFechaEmisionDesde() || !!this.filterFechaEmisionHasta()
        );
    }

    enviarAlProveedor(oc: OrdenCompra): void {
        if (!oc.id) return;
        this.enviandoId.set(oc.id);
        this.ocService.enviarAlProveedor(oc.id).subscribe({
            next: () => {
                this.enviandoId.set(null);
                this.cargarTodas();
            },
            error: () => {
                this.enviandoId.set(null);
                this.error.set('No se pudo enviar la OC al proveedor');
            }
        });
    }

    totalColumna(col: KanbanColumna): number {
        return col.ordenes.reduce((s, o) => s + (o.total ?? 0), 0);
    }
}
