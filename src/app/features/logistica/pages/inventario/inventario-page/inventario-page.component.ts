import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { InventarioService } from '../../../services/inventario.service';
import { InventarioItem } from '../../../models/inventario.model';
import { AlmacenService } from '../../../services/almacen.service';
import { Almacen } from '../../../models/almacen.model';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-inventario-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DataTableComponent,
        AlertComponent,
        PageHeaderComponent
    ],
    templateUrl: './inventario-page.component.html'
})
export class InventarioPageComponent implements OnInit {
    private readonly inventarioService = inject(InventarioService);
    private readonly almacenService    = inject(AlmacenService);
    private readonly authService       = inject(AuthService);

    // Data
    items     = signal<InventarioItem[]>([]);
    almacenes = signal<Almacen[]>([]);

    // UI state
    loading = signal(false);
    error   = signal<string | null>(null);

    // Filters — server-side (por botón Buscar del toolbar)
    searchQuery   = signal('');
    filtroAlmacen = signal('');

    // Filtro de almacén (dinámico, poblado desde la BD) para el toolbar
    almacenFilters: FilterConfig[] = [
        {
            field: 'almacen',
            label: 'Todos los almacenes',
            options: toObservable(this.almacenes).pipe(
                map(list => list.map(a => ({ value: a.id, label: a.nombre })))
            )
        }
    ];

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Inventario' }
    ];

    columns: TableColumn<InventarioItem>[] = [
        { key: 'almacenNombre',       label: 'Almacén' },
        { key: 'productoNombre',      label: 'Producto' },
        { key: 'sku',                 label: 'SKU' },
        { key: 'cantidad',            label: 'Total',     align: 'right',
          render: (r) => `${r.cantidad}` },
        { key: 'cantidadReservada',   label: 'Reservado', align: 'right',
          render: (r) => `${r.cantidadReservada}` },
        { key: 'cantidadDisponible',  label: 'Disponible', align: 'right',
          render: (r) => `${r.cantidadDisponible}` },
        { key: 'stockMinimo',         label: 'Stock Mín.', align: 'right',
          render: (r) => `${r.stockMinimo}` },
        { key: 'estadoStock', label: 'Estado', html: true,
          render: (r) => `<span class="badge ${this.badgeEstado(r)}">${this.labelEstado(r)}</span>` }
    ];

    actions: TableAction<InventarioItem>[] = [];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios.
     * Ver /logistics/api/inventarios/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/inventarios/export`,
        filename: 'inventario',
        params: () => ({
            companyId: this.companyId,
            almacenId: this.filtroAlmacen() || undefined,
            busqueda:  this.searchQuery()   || undefined,
        }),
    };

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadAlmacenes();
        this.loadInventario();
    }

    loadAlmacenes() {
        this.almacenService.getAlmacenes(this.companyId).subscribe({
            next: (res) => this.almacenes.set(res.content),
            error: () => this.almacenes.set([])
        });
    }

    loadInventario() {
        this.loading.set(true);
        this.error.set(null);
        this.inventarioService.getInventario(this.companyId, {
            almacenId: this.filtroAlmacen() || undefined,
            busqueda:  this.searchQuery()   || undefined,
            page:      this.currentPage(),
            size:      this.pageSize()
        }).subscribe({
            next: (res) => {
                this.items.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar inventario.');
                this.items.set([]);
                this.loading.set(false);
            }
        });
    }

    onSearchTerm(term: string) {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadInventario();
    }

    onFilterChangeEvent(event: FilterChangeEvent) {
        if (event.field === 'almacen') {
            this.filtroAlmacen.set(event.value != null ? String(event.value) : '');
            this.currentPage.set(0);
            this.loadInventario();
        }
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadInventario();
    }

    badgeEstado(item: InventarioItem): string {
        const estado = item.estadoStock ?? this.calcularEstado(item);
        const map: Record<string, string> = {
            NORMAL:     'badge-success',
            BAJO:       'badge-warning',
            CRITICO:    'badge-error',
            SOBRESTOCK: 'badge-accent'
        };
        return map[estado] ?? 'badge-neutral';
    }

    labelEstado(item: InventarioItem): string {
        return item.estadoStock ?? this.calcularEstado(item);
    }

    private calcularEstado(item: InventarioItem): string {
        if (item.cantidadDisponible <= 0) return 'CRITICO';
        if (item.cantidadDisponible <= item.stockMinimo) return 'BAJO';
        if (item.stockMaximo > 0 && item.cantidadDisponible > item.stockMaximo) return 'SOBRESTOCK';
        return 'NORMAL';
    }
}
