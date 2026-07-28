import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';

import { environment } from '@env/environment';
import { BackendExportService } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { UserService } from '@features/admin/services/user.service';
import { RolService } from '@features/admin/services/rol.service';
import { UserResponse, UserFilter, RolDto } from '@features/admin/models/user.model';
import { PaginationConfig, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import {
    DataTableComponent,
    TableColumn,
    FilterConfig,
    FilterChangeEvent,
    PaginationEvent,
    DateRangeFilterConfig,
    DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';

@Component({
    selector: 'app-reportes-clientes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent, DataTableComponent],
    templateUrl: './reportes-clientes.component.html',
    styleUrls: ['./reportes-clientes.component.scss'],
})
export class ReportesClientesComponent implements OnInit {
    private readonly userService = inject(UserService);
    private readonly rolService = inject(RolService);
    private readonly backendExportService = inject(BackendExportService);
    readonly catalog = inject(CatalogService);

    usuarios = signal<UserResponse[]>([]);
    roles = signal<RolDto[]>([]);
    cargando = signal(false);
    error = signal<string | null>(null);

    // Paginación server-side
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros server-side — TODO el filtrado ocurre en el backend, la vista nunca filtra la página cargada
    searchQuery = signal('');
    filterActivo = signal('');
    filterRolId = signal('');
    filterTipoDocumento = signal('');
    filterFechaCreacionDesde = signal<string | null>(null);
    filterFechaCreacionHasta = signal<string | null>(null);

    // KPI aproximado sobre la página actual (el backend no expone un agregado global de activos/inactivos)
    activosPagina = signal(0);

    // Filtros select del toolbar
    filters: FilterConfig[] = [
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
        signalFilter('rolId', 'Rol', this.roles, r => ({ value: r.id, label: r.nombre })),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento')
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de registro' }
    ];

    columns: TableColumn<UserResponse>[] = [
        { key: 'id', label: 'ID', width: '60px' },
        { key: 'username', label: 'Usuario' },
        { key: 'email', label: 'Email' },
        { key: 'nombreCompleto', label: 'Nombre', render: (r) => r.persona?.nombreCompleto ?? '—' },
        {
            key: 'activo', label: 'Estado', html: true,
            render: (r) => `<span class="badge badge-${r.activo ? 'success' : 'error'}">${r.activo ? 'ACTIVO' : 'INACTIVO'}</span>`
        },
        {
            key: 'createdAt', label: 'Registro',
            render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-PE') : '—'
        }
    ];

    ngOnInit() {
        this.rolService.getAll().subscribe({
            next: (roles) => this.roles.set(roles),
            error: () => this.roles.set([])
        });
        this.cargar();
    }

    cargar() {
        this.cargando.set(true);
        this.error.set(null);

        const pagination: PaginationConfig = {
            page: this.currentPage(),
            size: this.pageSize(),
            sort: { field: 'id', direction: 'desc' }
        };
        const filter: UserFilter = {
            search: this.searchQuery() || undefined,
            rolId: this.filterRolId() ? Number(this.filterRolId()) : undefined,
            activo: this.filterActivo() ? this.filterActivo() === 'true' : undefined,
            tipoDocumento: this.filterTipoDocumento() || undefined,
            fechaCreacionDesde: this.filterFechaCreacionDesde() ?? undefined,
            fechaCreacionHasta: this.filterFechaCreacionHasta() ?? undefined
        };

        this.userService.getAll(pagination, filter).subscribe({
            next: (page) => {
                this.usuarios.set(page.content ?? []);
                this.totalElements.set(pageTotalElements(page));
                this.totalPages.set(pageTotalPages(page));
                this.activosPagina.set((page.content ?? []).filter(u => u.activo).length);
                this.cargando.set(false);
            },
            error: () => {
                this.error.set('No disponible');
                this.cargando.set(false);
            }
        });
    }

    /** La búsqueda por texto va al backend (`search`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'activo':        this.filterActivo.set(valor); break;
            case 'rolId':         this.filterRolId.set(valor); break;
            case 'tipoDocumento': this.filterTipoDocumento.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaCreacion') {
            this.filterFechaCreacionDesde.set(event.from);
            this.filterFechaCreacionHasta.set(event.to);
            this.currentPage.set(0);
            this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterActivo.set('');
        this.filterRolId.set('');
        this.filterTipoDocumento.set('');
        this.filterFechaCreacionDesde.set(null);
        this.filterFechaCreacionHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    imprimir(): void {
        window.print();
    }

    onExportarCsv(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.users}/api/users/report/export`,
            filename: `reporte-clientes-${new Date().toISOString().substring(0, 10)}`,
        }, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.users}/api/users/report/export`,
            filename: 'reporte-clientes',
        }, 'xlsx');
    }
}
