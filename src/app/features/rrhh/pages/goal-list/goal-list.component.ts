import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction,
    FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent,
    PaginationEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { EvaluationService } from '../../services/evaluation.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { CatalogService } from '@core/services/catalog.service';
import {
    Goal,
    GoalStatus,
    GoalPriority,
    GOAL_PRIORITY_LABELS,
} from '../../models/evaluation.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-goal-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DrawerComponent,
        DataTableComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './goal-list.component.html',
})
export class GoalListComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly evaluationService = inject(EvaluationService);
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    readonly catalog = inject(CatalogService);

    readonly goals = this.evaluationService.goals;
    readonly loading = this.evaluationService.loading;
    /** Fuente server-side del search-select de empleado. */
    readonly employeeSource = employeeSelectSource(this.employeeService);
    /** Se mantiene para poblar los selects employeeId/asignadoPorId del toolbar. */
    readonly employees = this.employeeService.activeEmployees;
    /** Departamentos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    readonly departamentosFiltro = signal<Department[]>([]);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showProgressDrawer = signal(false);
    progressGoal = signal<Goal | null>(null);
    progressSubmitting = signal(false);
    progressError = signal<string | null>(null);

    // ── Filtros (TODOS server-side) ─────────────────────────────────────────
    searchQuery           = signal('');
    filtroEstado           = signal('');
    filtroPrioridad        = signal('');
    filtroEmployeeId       = signal('');
    filtroAsignadoPorId    = signal('');
    filtroDepartmentId     = signal('');
    filtroFechaInicioDesde = signal<string | null>(null);
    filtroFechaInicioHasta = signal<string | null>(null);
    filtroFechaFinDesde    = signal<string | null>(null);
    filtroFechaFinHasta    = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);

    /** Paginación server-side: totalElements/totalPages vienen del backend. */
    readonly totalElements = this.evaluationService.goalsTotalElements;
    readonly totalPages = this.evaluationService.goalsTotalPages;

    /** KPIs sobre el dataset completo (snapshot server-side), no la página visible. */
    readonly enProgreso = this.evaluationService.metasEnProgreso;
    readonly completadas = this.evaluationService.metasCompletadas;
    readonly retrasadas = this.evaluationService.metasRetrasadas;
    readonly totalMetas = this.evaluationService.metasTotal;

    readonly priorityOptions = Object.entries(GOAL_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Metas' },
    ];

    columns: TableColumn<Goal>[] = [
        {
            key: 'employeeName', label: 'Empleado',
            render: row => row.employeeName || `Emp #${row.employeeId}`
        },
        { key: 'titulo', label: 'Título' },
        {
            key: 'fechaInicio', label: 'Inicio',
            render: row => new Date(row.fechaInicio + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'fechaFin', label: 'Fin',
            render: row => new Date(row.fechaFin + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'prioridad', label: 'Prioridad', html: true,
            render: row => `<span class="badge badge-${this.badgePrioridad(row.prioridad)}">${this.catalog.label('PRIORIDAD_META', row.prioridad)}</span>`
        },
        {
            key: 'porcentajeAvance', label: 'Progreso', html: true,
            render: row => `
                <div style="display:flex;align-items:center;gap:0.5rem;min-width:120px">
                    <div style="flex:1;background:var(--color-border);border-radius:4px;overflow:hidden;height:8px">
                        <div style="width:${row.porcentajeAvance}%;background:var(--color-primary);height:100%"></div>
                    </div>
                    <span class="text-xs" style="white-space:nowrap">${row.porcentajeAvance}%</span>
                </div>
            `
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${this.catalog.label('ESTADO_META', row.estado)}</span>`
        },
    ];

    actions: TableAction<Goal>[] = [
        {
            label: 'Editar', icon: '✎', class: 'btn-view',
            show: row => row.estado !== 'COMPLETADO' && row.estado !== 'CANCELADO',
            onClick: row => this.openEdit(row),
        },
        {
            label: 'Actualizar Progreso', icon: '⟳', class: 'btn-view',
            show: row => row.estado !== 'COMPLETADO' && row.estado !== 'CANCELADO',
            onClick: row => this.openProgress(row),
        },
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'EN_PROGRESO' || row.estado === 'RETRASADO',
            onClick: row => this.complete(row),
        },
        {
            label: 'Cancelar', icon: '✕', class: 'btn-icon-delete',
            show: row => row.estado !== 'CANCELADO' && row.estado !== 'COMPLETADO',
            onClick: row => this.cancel(row),
        },
    ];

    readonly goalForm = this.fb.group({
        employeeId: [null as number | null, Validators.required],
        titulo: ['', [Validators.required, Validators.maxLength(200)]],
        descripcion: [''],
        fechaInicio: ['', Validators.required],
        fechaFin: ['', Validators.required],
        prioridad: ['MEDIA'],
        porcentajeAvance: [0, [Validators.min(0), Validators.max(100)]],
    });

    /**
     * La meta pertenece a un empleado: reapuntarla descuadra el avance y las
     * estadísticas ya calculadas → se muestra bloqueada al editar.
     */
    private static readonly CAMPOS_BLOQUEADOS = ['employeeId'];

    readonly progressControl = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(100)] });

    // Filtros select del toolbar. Las opciones salen de erp_parameters / listas dinámicas.
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_META', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'PRIORIDAD_META', 'prioridad', 'Prioridad'),
        signalFilter('employeeId', 'Empleado', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('asignadoPorId', 'Asignado por', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Departamento', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaInicio', label: 'Fecha de inicio' },
        { field: 'fechaFin', label: 'Fecha límite' },
    ];

    ngOnInit(): void {
        this.employeeService.loadEmployees().catch(() => { /* selects del toolbar */ });
        this.loadDepartamentosFiltro();
        this.loadPage();
        this.evaluationService.loadGoalsStatsSnapshot();
        // El select de empleado del formulario carga sus opciones bajo demanda (server-side).
    }

    /** Departamentos para el select de filtro (no muta el estado compartido de DepartmentService). */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    /** Carga la página actual server-side con TODOS los filtros del toolbar. */
    private loadPage(): void {
        this.evaluationService.loadGoalsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            estado: this.filtroEstado() || undefined,
            prioridad: this.filtroPrioridad() || undefined,
            employeeId: this.filtroEmployeeId() ? Number(this.filtroEmployeeId()) : undefined,
            asignadoPorId: this.filtroAsignadoPorId() ? Number(this.filtroAsignadoPorId()) : undefined,
            departmentId: this.filtroDepartmentId() ? Number(this.filtroDepartmentId()) : undefined,
            fechaInicioDesde: this.filtroFechaInicioDesde() || undefined,
            fechaInicioHasta: this.filtroFechaInicioHasta() || undefined,
            fechaFinDesde: this.filtroFechaFinDesde() || undefined,
            fechaFinHasta: this.filtroFechaFinHasta() || undefined,
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const v = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':        this.filtroEstado.set(v); break;
            case 'prioridad':     this.filtroPrioridad.set(v); break;
            case 'employeeId':    this.filtroEmployeeId.set(v); break;
            case 'asignadoPorId': this.filtroAsignadoPorId.set(v); break;
            case 'departmentId':  this.filtroDepartmentId.set(v); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaInicio':
                this.filtroFechaInicioDesde.set(event.from);
                this.filtroFechaInicioHasta.set(event.to);
                break;
            case 'fechaFin':
                this.filtroFechaFinDesde.set(event.from);
                this.filtroFechaFinHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filtroEstado.set('');
        this.filtroPrioridad.set('');
        this.filtroEmployeeId.set('');
        this.filtroAsignadoPorId.set('');
        this.filtroDepartmentId.set('');
        this.filtroFechaInicioDesde.set(null);
        this.filtroFechaInicioHasta.set(null);
        this.filtroFechaFinDesde.set(null);
        this.filtroFechaFinHasta.set(null);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    openCreate(): void {
        this.goalForm.reset({ prioridad: 'MEDIA', porcentajeAvance: 0 });
        bloquearEnEdicion(this.goalForm, GoalListComponent.CAMPOS_BLOQUEADOS, false);
        this.editMode.set(false);
        this.selectedId.set(null);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(goal: Goal): void {
        this.goalForm.patchValue({
            employeeId: goal.employeeId,
            titulo: goal.titulo,
            descripcion: goal.descripcion || '',
            fechaInicio: goal.fechaInicio,
            fechaFin: goal.fechaFin,
            prioridad: goal.prioridad,
            porcentajeAvance: goal.porcentajeAvance,
        });
        bloquearEnEdicion(this.goalForm, GoalListComponent.CAMPOS_BLOQUEADOS, true);
        this.editMode.set(true);
        this.selectedId.set(goal.id);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.goalForm.reset();
    }

    async guardar(): Promise<void> {
        if (this.goalForm.invalid) {
            this.goalForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            // getRawValue(): 'employeeId' queda bloqueado en edición y no saldría en .value.
            const val = this.goalForm.getRawValue();
            const request = {
                employeeId: val.employeeId!,
                titulo: val.titulo!,
                descripcion: val.descripcion || undefined,
                fechaInicio: val.fechaInicio!,
                fechaFin: val.fechaFin!,
                prioridad: val.prioridad || 'MEDIA',
                porcentajeAvance: val.porcentajeAvance ?? 0,
            };
            if (this.editMode() && this.selectedId()) {
                await this.evaluationService.updateGoal(this.selectedId()!, request);
            } else {
                await this.evaluationService.createGoal(request);
            }
            this.closeDrawer();
            this.loadPage();
            this.evaluationService.loadGoalsStatsSnapshot();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al guardar meta';
            this.submitError.set(message);
        } finally {
            this.submitting.set(false);
        }
    }

    openProgress(goal: Goal): void {
        this.progressGoal.set(goal);
        this.progressControl.setValue(goal.porcentajeAvance);
        this.progressError.set(null);
        this.showProgressDrawer.set(true);
    }

    closeProgressDrawer(): void {
        this.showProgressDrawer.set(false);
        this.progressGoal.set(null);
    }

    async guardarProgreso(): Promise<void> {
        const goal = this.progressGoal();
        if (!goal || this.progressControl.invalid) {
            this.progressControl.markAsTouched();
            return;
        }
        this.progressSubmitting.set(true);
        this.progressError.set(null);
        try {
            await this.evaluationService.updateGoalProgress(goal.id, this.progressControl.value);
            this.closeProgressDrawer();
            this.loadPage();
            this.evaluationService.loadGoalsStatsSnapshot();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al actualizar progreso';
            this.progressError.set(message);
        } finally {
            this.progressSubmitting.set(false);
        }
    }

    async complete(goal: Goal): Promise<void> {
        await this.evaluationService.completeGoal(goal.id);
        this.loadPage();
        this.evaluationService.loadGoalsStatsSnapshot();
    }

    async cancel(goal: Goal): Promise<void> {
        await this.evaluationService.cancelGoal(goal.id);
        this.loadPage();
        this.evaluationService.loadGoalsStatsSnapshot();
    }

    getControl(name: string): FormControl {
        return this.goalForm.get(name) as FormControl;
    }

    badgeEstado(estado: GoalStatus): string {
        const map: Record<GoalStatus, string> = {
            EN_PROGRESO: 'accent',
            COMPLETADO: 'success',
            CANCELADO: 'neutral',
            RETRASADO: 'error',
        };
        return map[estado] ?? 'neutral';
    }

    badgePrioridad(prioridad: GoalPriority): string {
        const map: Record<GoalPriority, string> = {
            ALTA: 'error',
            MEDIA: 'warning',
            BAJA: 'neutral',
        };
        return map[prioridad] ?? 'neutral';
    }
}
