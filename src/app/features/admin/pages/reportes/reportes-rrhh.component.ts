import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { environment } from '@env/environment';
import { BackendExportService } from '@shared/services/backend-export.service';
import { ButtonComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { EmployeeService } from '@features/rrhh/services/employee.service';
import { DepartmentService } from '@features/rrhh/services/department.service';
import { PositionService } from '@features/rrhh/services/position.service';
import { Employee } from '@features/rrhh/models/employee.model';
import { PAGINATION } from '@shared/constants/app.constants';
import {
    DataTableComponent,
    TableColumn,
    FilterConfig,
    FilterChangeEvent,
    PaginationEvent,
    DateRangeFilterConfig,
    DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';

@Component({
    selector: 'app-reportes-rrhh',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent, DataTableComponent],
    templateUrl: './reportes-rrhh.component.html',
    styleUrls: ['./reportes-rrhh.component.scss'],
})
export class ReportesRrhhComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly positionService = inject(PositionService);
    private readonly backendExportService = inject(BackendExportService);
    readonly catalog = inject(CatalogService);

    readonly loading = this.employeeService.loading;
    readonly empleados = this.employeeService.employees;
    error = signal<string | null>(null);

    // Listas para los selects de filtro del toolbar (carga eager, no server-search)
    readonly departments = this.departmentService.activeDepartments;
    positionsFiltro = signal<{ id: number; nombre: string }[]>([]);

    // Paginación server-side
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterEstado = signal('');
    filterDepartmentId = signal<number | null>(null);
    filterPositionId = signal<number | null>(null);
    filterTipoDocumento = signal('');
    filterTipoContrato = signal('');
    filterFechaIngresoDesde = signal<string | undefined>(undefined);
    filterFechaIngresoHasta = signal<string | undefined>(undefined);
    filterFechaSalidaDesde = signal<string | undefined>(undefined);
    filterFechaSalidaHasta = signal<string | undefined>(undefined);

    // KPI aproximado sobre la página actual
    activosPagina = signal(0);

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_EMPLEADO', 'estado', 'Todos los estados'),
        signalFilter('departmentId', 'Todas las áreas', this.departments,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('positionId', 'Todos los cargos', this.positionsFiltro,
            p => ({ value: p.id, label: p.nombre })),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento'),
        catalogFilter(this.catalog, 'TIPO_CONTRATO', 'tipoContrato', 'Tipo de contrato'),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaIngreso', label: 'Fecha de ingreso' },
        { field: 'fechaSalida', label: 'Fecha de cese' },
    ];

    columns: TableColumn<Employee>[] = [
        { key: 'codigoEmpleado', label: 'Código', width: '100px' },
        { key: 'nombres', label: 'Nombres y Apellidos', render: (e) => `${e.nombres} ${e.apellidos}` },
        { key: 'documentoIdentidad', label: 'DNI' },
        { key: 'positionName', label: 'Cargo', render: (e) => e.positionName ?? e.cargo ?? '—' },
        {
            key: 'departmentName', label: 'Área', html: true,
            render: (e) => {
                const area = e.departmentName ?? e.area;
                return area ? `<span class="badge badge-neutral">${area}</span>` : '<span class="text-subtle">—</span>';
            }
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (e) => `<span class="badge badge-${e.estado === 'ACTIVO' ? 'success' : 'error'}">${this.catalog.label('ESTADO_EMPLEADO', e.estado)}</span>`
        },
        {
            key: 'fechaIngreso', label: 'Fecha Ingreso',
            render: (e) => e.fechaIngreso ? new Date(e.fechaIngreso).toLocaleDateString('es-PE') : '—'
        }
    ];

    ngOnInit() {
        this.departmentService.loadDepartments().catch(() => { /* select opcional */ });
        this.loadPositionsFiltro();
        this.cargar();
    }

    /** Cargos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    private loadPositionsFiltro(): void {
        this.positionService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.positionsFiltro.set(res.content ?? []))
            .catch(() => this.positionsFiltro.set([]));
    }

    cargar(): void {
        this.error.set(null);
        this.employeeService.loadEmployeesPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            status: this.filterEstado() || undefined,
            departmentId: this.filterDepartmentId(),
            positionId: this.filterPositionId(),
            tipoDocumento: this.filterTipoDocumento() || undefined,
            tipoContrato: this.filterTipoContrato() || undefined,
            fechaIngresoDesde: this.filterFechaIngresoDesde(),
            fechaIngresoHasta: this.filterFechaIngresoHasta(),
            fechaSalidaDesde: this.filterFechaSalidaDesde(),
            fechaSalidaHasta: this.filterFechaSalidaHasta(),
        }).then((res) => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
            this.activosPagina.set(this.empleados().filter(e => e.estado === 'ACTIVO').length);
        }).catch(() => {
            this.error.set('No disponible');
        });
    }

    /** La búsqueda por texto va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':         this.filterEstado.set(valor); break;
            case 'departmentId':   this.filterDepartmentId.set(event.value != null ? Number(event.value) : null); break;
            case 'positionId':     this.filterPositionId.set(event.value != null ? Number(event.value) : null); break;
            case 'tipoDocumento':  this.filterTipoDocumento.set(valor); break;
            case 'tipoContrato':   this.filterTipoContrato.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaIngreso':
                this.filterFechaIngresoDesde.set(event.from ?? undefined);
                this.filterFechaIngresoHasta.set(event.to ?? undefined);
                break;
            case 'fechaSalida':
                this.filterFechaSalidaDesde.set(event.from ?? undefined);
                this.filterFechaSalidaHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterDepartmentId.set(null);
        this.filterPositionId.set(null);
        this.filterTipoDocumento.set('');
        this.filterTipoContrato.set('');
        this.filterFechaIngresoDesde.set(undefined);
        this.filterFechaIngresoHasta.set(undefined);
        this.filterFechaSalidaDesde.set(undefined);
        this.filterFechaSalidaHasta.set(undefined);
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
            url: `${environment.apiUrls.hr}/api/employees/report/export`,
            filename: `reporte-rrhh-${new Date().toISOString().substring(0, 10)}`,
        }, 'csv');
    }

    exportarExcel(): void {
        this.backendExportService.download({
            url: `${environment.apiUrls.hr}/api/employees/report/export`,
            filename: 'reporte-rrhh',
        }, 'xlsx');
    }
}
