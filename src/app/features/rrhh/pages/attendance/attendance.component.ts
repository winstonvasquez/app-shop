import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { Attendance } from '../../models/attendance.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import {
    DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent, PaginationEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

type TipoRegistro = 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';

@Component({
    selector: 'app-attendance',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
        AdminFormSectionComponent,
        ButtonComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
        RichTextEditorComponent,
    ],
    templateUrl: './attendance.component.html',
})
export class AttendanceComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly attendanceService = inject(AttendanceService);
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    readonly catalog = inject(CatalogService);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.attendanceService.loading;
    // Se mantiene para resolver el nombre del empleado en el form y como fallback en la tabla.
    readonly employees = this.employeeService.activeEmployees;
    /** Departamentos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    readonly departamentosFiltro = signal<Department[]>([]);
    /** Fuente server-side del search-select de empleado del formulario. */
    readonly employeeSource = employeeSelectSource(this.employeeService);
    readonly attendances = signal<Attendance[]>([]);

    // ── UI state ──────────────────────────────────────────────────────────────
    error       = signal<string | null>(null);
    showModal   = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // ── Filtros (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery         = signal('');
    filterTipoRegistro  = signal('');
    filterEmployeeId    = signal('');
    filterDepartmentId  = signal('');
    filterAprobadoPorId = signal('');
    filterFechaDesde    = signal<string | null>(null);
    filterFechaHasta    = signal<string | null>(null);

    // ── Pagination (server-side) ────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal<number>(15);
    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH',  url: '/admin/rrhh/dashboard' },
        { label: 'Asistencia' },
    ];

    // Filtros select del toolbar. Las opciones salen de erp_parameters / listas dinámicas.
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'TIPO_REGISTRO_ASISTENCIA', 'tipoRegistro', 'Tipo'),
        signalFilter('employeeId', 'Empleado', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Departamento', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('aprobadoPorId', 'Aprobado por', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
    ];

    /** Rango de fechas de la marcación para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fecha', label: 'Rango de fechas' }
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Attendance>[] = [
        { key: 'employeeId', label: 'Empleado', render: row => row.employeeName ?? this.getEmployeeName(row.employeeId) },
        { key: 'fecha',      label: 'Fecha',
          render: row => new Date(row.fecha + 'T00:00').toLocaleDateString('es-PE') },
        { key: 'horaEntrada', label: 'Entrada', render: row => row.horaEntrada ?? '—' },
        { key: 'horaSalida',  label: 'Salida',  render: row => row.horaSalida  ?? '—' },
        {
            key: 'tipoRegistro', label: 'Tipo', html: true,
            render: row => `<span class="badge badge-${this.badgeTipo(row.tipoRegistro)}">${this.catalog.label('TIPO_REGISTRO_ASISTENCIA', row.tipoRegistro)}</span>`
        },
        { key: 'observaciones', label: 'Observaciones', html: true, render: row => row.observaciones ?? '—' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta todos los filtros actuales). Ver /hr/api/attendance/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/attendance/export`,
        filename: 'asistencia',
        params: () => ({
            search: this.searchQuery(),
            employeeId: this.filterEmployeeId(),
            departmentId: this.filterDepartmentId(),
            tipo: this.filterTipoRegistro(),
            aprobadoPorId: this.filterAprobadoPorId(),
            fechaDesde: this.filterFechaDesde() ?? undefined,
            fechaHasta: this.filterFechaHasta() ?? undefined,
        }),
    };

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly attendanceForm = this.fb.group({
        employeeId:    [null as number | null, Validators.required],
        fecha:         [new Date().toISOString().split('T')[0], Validators.required],
        horaEntrada:   [''],
        horaSalida:    [''],
        tipoRegistro:  ['NORMAL', Validators.required],
        observaciones: [''],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    async ngOnInit(): Promise<void> {
        try {
            await this.employeeService.loadEmployees();
        } catch { /* servicio puede no estar disponible */ }
        this.loadDepartamentosFiltro();
        await this.loadAttendances();
    }

    /** Departamentos para el select de filtro (no muta el estado compartido de DepartmentService). */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    /** Carga desde el backend los registros de asistencia según página + filtros actuales. */
    private async loadAttendances(): Promise<void> {
        try {
            const res = await this.attendanceService.getAttendancePaged({
                page: this.currentPage(),
                size: this.pageSize(),
                search: this.searchQuery() || undefined,
                employeeId: this.filterEmployeeId() ? Number(this.filterEmployeeId()) : undefined,
                departmentId: this.filterDepartmentId() ? Number(this.filterDepartmentId()) : undefined,
                tipoRegistro: this.filterTipoRegistro() || undefined,
                aprobadoPorId: this.filterAprobadoPorId() ? Number(this.filterAprobadoPorId()) : undefined,
                fechaDesde: this.filterFechaDesde() || undefined,
                fechaHasta: this.filterFechaHasta() || undefined,
            });
            this.attendances.set(res.content ?? []);
            this.totalElements.set(pageTotalElements(res));
            this.totalPages.set(pageTotalPages(res));
        } catch {
            this.attendances.set([]);
            this.totalElements.set(0);
            this.totalPages.set(0);
        }
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        void this.loadAttendances();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'tipoRegistro':  this.filterTipoRegistro.set(valor); break;
            case 'employeeId':    this.filterEmployeeId.set(valor); break;
            case 'departmentId':  this.filterDepartmentId.set(valor); break;
            case 'aprobadoPorId': this.filterAprobadoPorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        void this.loadAttendances();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fecha') return;
        this.filterFechaDesde.set(event.from);
        this.filterFechaHasta.set(event.to);
        this.currentPage.set(0);
        void this.loadAttendances();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipoRegistro.set('');
        this.filterEmployeeId.set('');
        this.filterDepartmentId.set('');
        this.filterAprobadoPorId.set('');
        this.filterFechaDesde.set(null);
        this.filterFechaHasta.set(null);
        this.currentPage.set(0);
        void this.loadAttendances();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        void this.loadAttendances();
    }

    openCreateModal(): void {
        this.attendanceForm.reset({
            fecha: new Date().toISOString().split('T')[0],
            tipoRegistro: 'NORMAL',
        });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.attendanceForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.attendanceForm.invalid) {
            this.attendanceForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const formValue = this.attendanceForm.value;
            const request = {
                ...formValue,
                fecha: typeof formValue.fecha === 'string' ? formValue.fecha
                    : (formValue.fecha as unknown as Date)?.toISOString?.()?.split('T')[0] ?? '',
                // LocalTime no acepta "" — omitir las horas vacías (registros sin marca de hora).
                horaEntrada: formValue.horaEntrada || undefined,
                horaSalida: formValue.horaSalida || undefined,
            };
            await this.attendanceService.registerAttendance(request as never);
            this.closeModal();
            // Refresca desde el backend para reflejar el registro real.
            this.currentPage.set(0);
            await this.loadAttendances();
        } catch {
            this.submitError.set('Error al registrar asistencia. Verifique los datos.');
        } finally {
            this.submitting.set(false);
        }
    }

    getControl(name: string): FormControl {
        return this.attendanceForm.get(name) as FormControl;
    }

    getEmployeeName(id: number): string {
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
    }

    badgeTipo(tipo: TipoRegistro): string {
        const map: Record<TipoRegistro, string> = {
            NORMAL:     'success',
            TARDANZA:   'warning',
            FALTA:      'error',
            PERMISO:    'neutral',
            LICENCIA:   'neutral',
            VACACIONES: 'accent',
        };
        return map[tipo] ?? 'neutral';
    }
}
