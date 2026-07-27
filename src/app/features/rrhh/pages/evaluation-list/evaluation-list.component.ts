import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
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
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { EvaluationService } from '../../services/evaluation.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { CatalogService } from '@core/services/catalog.service';
import {
    Evaluation,
    EvaluationStatus,
} from '../../models/evaluation.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-evaluation-list',
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
        CatalogSelectComponent,
    ],
    templateUrl: './evaluation-list.component.html',
})
export class EvaluationListComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly evaluationService = inject(EvaluationService);
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    readonly catalog = inject(CatalogService);

    readonly evaluations = this.evaluationService.evaluations;
    readonly loading = this.evaluationService.loading;
    /** Criterios activos disponibles para agregar filas de detalle en el drawer. */
    readonly activeCriteria = this.evaluationService.activeCriteria;
    /** Fuente server-side de los search-select de empleado y evaluador. */
    readonly employeeSource = employeeSelectSource(this.employeeService);
    /** Se mantiene para poblar los selects employeeId/evaluadorId del toolbar. */
    readonly employees = this.employeeService.activeEmployees;
    /** Departamentos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    readonly departamentosFiltro = signal<Department[]>([]);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Filtros server-side: search + estado + tipo + empleado + evaluador + departamento + rangos de fecha
    searchQuery = signal('');
    filtroEstado = signal('');
    filtroTipo = signal('');
    filtroEmployeeId = signal('');
    filtroEvaluadorId = signal('');
    filtroDepartmentId = signal('');
    filtroFechaEvaluacionDesde = signal<string | undefined>(undefined);
    filtroFechaEvaluacionHasta = signal<string | undefined>(undefined);
    filtroProximaRevisionDesde = signal<string | undefined>(undefined);
    filtroProximaRevisionHasta = signal<string | undefined>(undefined);

    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);

    /** Paginación server-side: totalElements/totalPages vienen del backend. */
    readonly totalElements = this.evaluationService.totalElements;
    readonly totalPages = this.evaluationService.totalPages;

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /hr/api/evaluations/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/evaluations/export`,
        filename: 'evaluaciones',
        params: () => ({
            search: this.searchQuery(),
            estado: this.filtroEstado(),
            tipo: this.filtroTipo(),
            employeeId: this.filtroEmployeeId(),
            evaluadorId: this.filtroEvaluadorId(),
            departmentId: this.filtroDepartmentId(),
            fechaEvaluacionDesde: this.filtroFechaEvaluacionDesde(),
            fechaEvaluacionHasta: this.filtroFechaEvaluacionHasta(),
            proximaRevisionDesde: this.filtroProximaRevisionDesde(),
            proximaRevisionHasta: this.filtroProximaRevisionHasta(),
        }),
    };

    /** KPIs sobre el dataset completo (snapshot server-side), no la página visible. */
    readonly borradores = this.evaluationService.borradores;
    readonly completadas = this.evaluationService.completadas;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Evaluaciones' },
    ];

    columns: TableColumn<Evaluation>[] = [
        {
            key: 'employeeName', label: 'Empleado',
            render: row => row.employeeName || `Emp #${row.employeeId}`
        },
        {
            key: 'evaluadorName', label: 'Evaluador',
            render: row => row.evaluadorName || `Emp #${row.evaluadorId}`
        },
        { key: 'periodo', label: 'Período' },
        {
            key: 'tipoEvaluacion', label: 'Tipo',
            render: row => this.catalog.label('TIPO_EVALUACION', row.tipoEvaluacion)
        },
        {
            key: 'fechaEvaluacion', label: 'Fecha',
            render: row => new Date(row.fechaEvaluacion + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'puntaje', label: 'Puntaje', align: 'center', html: true,
            render: row => `<span class="badge badge-${this.badgePuntaje(row.puntaje)}">${row.puntaje}/100</span>`
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${this.catalog.label('ESTADO_EVALUACION', row.estado)}</span>`
        },
    ];

    actions: TableAction<Evaluation>[] = [
        {
            label: 'Editar', icon: '✎', class: 'btn-view',
            show: row => row.estado === 'BORRADOR',
            onClick: row => this.openEdit(row),
        },
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'BORRADOR',
            onClick: row => this.complete(row),
        },
        {
            label: 'Aprobar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'COMPLETADA',
            onClick: row => this.approve(row),
        },
        {
            label: 'Cancelar', icon: '✕', class: 'btn-icon-delete',
            show: row => row.estado !== 'CANCELADA' && row.estado !== 'APROBADA',
            onClick: row => this.cancel(row),
        },
    ];

    readonly evaluationForm = this.fb.group({
        employeeId: [null as number | null, Validators.required],
        evaluadorId: [null as number | null, Validators.required],
        periodo: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
        tipoEvaluacion: ['ANUAL'],
        puntaje: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        fechaEvaluacion: ['', Validators.required],
        comentarios: [''],
        fortalezas: [''],
        areasMejora: [''],
        planMejora: [''],
        details: this.fb.array<FormGroup>([]),
    });

    get detailsArray(): FormArray {
        return this.evaluationForm.get('details') as FormArray;
    }

    ngOnInit(): void {
        this.employeeService.loadEmployees().catch(() => { /* selects del toolbar */ });
        this.loadDepartamentosFiltro();
        this.cargarEvaluaciones();
        this.evaluationService.loadCriteria();
        this.evaluationService.loadStatsSnapshot();
        // El select de empleado/evaluador del formulario carga sus opciones bajo demanda (server-side).
    }

    /** Departamentos para el select de filtro (no muta el estado compartido de DepartmentService). */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    private createDetailGroup(criteriaId: number | null = null, puntaje = 0, comentarios = ''): FormGroup {
        return this.fb.group({
            criteriaId: [criteriaId as number | null, Validators.required],
            puntaje: [puntaje, [Validators.required, Validators.min(0), Validators.max(100)]],
            comentarios: [comentarios],
        });
    }

    addDetailRow(): void {
        this.detailsArray.push(this.createDetailGroup());
    }

    removeDetailRow(index: number): void {
        this.detailsArray.removeAt(index);
    }

    getDetailControl(index: number, name: string): FormControl {
        return (this.detailsArray.at(index) as FormGroup).get(name) as FormControl;
    }

    // Filtros select del toolbar. Las opciones salen de erp_parameters / listas dinámicas.
    readonly toolbarFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_EVALUACION', 'estado', 'Todos los estados'),
        catalogFilter(this.catalog, 'TIPO_EVALUACION', 'tipo', 'Todos los tipos'),
        signalFilter('employeeId', 'Empleado evaluado', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('evaluadorId', 'Evaluador', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Todos los departamentos', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaEvaluacion', label: 'Fecha de evaluación' },
        { field: 'proximaRevision', label: 'Próxima revisión' },
    ];

    private cargarEvaluaciones(): void {
        this.evaluationService.loadEvaluations({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            estado: this.filtroEstado() || undefined,
            tipo: this.filtroTipo() || undefined,
            employeeId: this.filtroEmployeeId() ? Number(this.filtroEmployeeId()) : undefined,
            evaluadorId: this.filtroEvaluadorId() ? Number(this.filtroEvaluadorId()) : undefined,
            departmentId: this.filtroDepartmentId() ? Number(this.filtroDepartmentId()) : undefined,
            fechaEvaluacionDesde: this.filtroFechaEvaluacionDesde(),
            fechaEvaluacionHasta: this.filtroFechaEvaluacionHasta(),
            proximaRevisionDesde: this.filtroProximaRevisionDesde(),
            proximaRevisionHasta: this.filtroProximaRevisionHasta(),
        });
    }

    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargarEvaluaciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const v = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':       this.filtroEstado.set(v); break;
            case 'tipo':         this.filtroTipo.set(v); break;
            case 'employeeId':   this.filtroEmployeeId.set(v); break;
            case 'evaluadorId':  this.filtroEvaluadorId.set(v); break;
            case 'departmentId': this.filtroDepartmentId.set(v); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarEvaluaciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaEvaluacion':
                this.filtroFechaEvaluacionDesde.set(event.from ?? undefined);
                this.filtroFechaEvaluacionHasta.set(event.to ?? undefined);
                break;
            case 'proximaRevision':
                this.filtroProximaRevisionDesde.set(event.from ?? undefined);
                this.filtroProximaRevisionHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargarEvaluaciones();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filtroEstado.set('');
        this.filtroTipo.set('');
        this.filtroEmployeeId.set('');
        this.filtroEvaluadorId.set('');
        this.filtroDepartmentId.set('');
        this.filtroFechaEvaluacionDesde.set(undefined);
        this.filtroFechaEvaluacionHasta.set(undefined);
        this.filtroProximaRevisionDesde.set(undefined);
        this.filtroProximaRevisionHasta.set(undefined);
        this.currentPage.set(0);
        this.cargarEvaluaciones();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargarEvaluaciones();
    }

    openCreate(): void {
        this.evaluationForm.reset({ tipoEvaluacion: 'ANUAL', puntaje: 0 });
        this.clearDetailsArray();
        this.editMode.set(false);
        this.selectedId.set(null);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(ev: Evaluation): void {
        this.evaluationForm.patchValue({
            employeeId: ev.employeeId,
            evaluadorId: ev.evaluadorId,
            periodo: ev.periodo,
            tipoEvaluacion: ev.tipoEvaluacion,
            puntaje: ev.puntaje,
            fechaEvaluacion: ev.fechaEvaluacion,
            comentarios: ev.comentarios || '',
            fortalezas: ev.fortalezas || '',
            areasMejora: ev.areasMejora || '',
            planMejora: ev.planMejora || '',
        });
        this.clearDetailsArray();
        (ev.details || []).forEach(d => {
            this.detailsArray.push(this.createDetailGroup(d.criteriaId, d.puntaje, d.comentarios || ''));
        });
        this.editMode.set(true);
        this.selectedId.set(ev.id);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.evaluationForm.reset();
        this.clearDetailsArray();
    }

    private clearDetailsArray(): void {
        while (this.detailsArray.length > 0) this.detailsArray.removeAt(0);
    }

    async guardar(): Promise<void> {
        if (this.evaluationForm.invalid) {
            this.evaluationForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.evaluationForm.value;
            const details = (this.detailsArray.value as Array<{ criteriaId: number | null; puntaje: number; comentarios: string }>)
                .filter(d => d.criteriaId != null)
                .map(d => ({
                    criteriaId: d.criteriaId!,
                    puntaje: d.puntaje,
                    comentarios: d.comentarios || undefined,
                }));
            const request = {
                employeeId: val.employeeId!,
                evaluadorId: val.evaluadorId!,
                periodo: val.periodo!,
                tipoEvaluacion: val.tipoEvaluacion || 'ANUAL',
                puntaje: val.puntaje!,
                fechaEvaluacion: val.fechaEvaluacion!,
                comentarios: val.comentarios || undefined,
                fortalezas: val.fortalezas || undefined,
                areasMejora: val.areasMejora || undefined,
                planMejora: val.planMejora || undefined,
                details: details.length > 0 ? details : undefined,
            };
            if (this.editMode() && this.selectedId()) {
                await this.evaluationService.updateEvaluation(this.selectedId()!, request);
            } else {
                await this.evaluationService.createEvaluation(request);
            }
            this.closeDrawer();
            this.cargarEvaluaciones();
            this.evaluationService.loadStatsSnapshot();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al guardar evaluación';
            this.submitError.set(message);
        } finally {
            this.submitting.set(false);
        }
    }

    async complete(ev: Evaluation): Promise<void> {
        await this.evaluationService.completeEvaluation(ev.id);
        this.evaluationService.loadStatsSnapshot();
    }

    async approve(ev: Evaluation): Promise<void> {
        await this.evaluationService.approveEvaluation(ev.id);
        this.evaluationService.loadStatsSnapshot();
    }

    async cancel(ev: Evaluation): Promise<void> {
        await this.evaluationService.cancelEvaluation(ev.id);
        this.evaluationService.loadStatsSnapshot();
    }

    getControl(name: string): FormControl {
        return this.evaluationForm.get(name) as FormControl;
    }

    badgeEstado(estado: EvaluationStatus): string {
        const map: Record<EvaluationStatus, string> = {
            BORRADOR: 'warning',
            COMPLETADA: 'accent',
            APROBADA: 'success',
            CANCELADA: 'neutral',
        };
        return map[estado] ?? 'neutral';
    }

    badgePuntaje(p: number): string {
        if (p >= 80) return 'success';
        if (p >= 60) return 'warning';
        return 'error';
    }
}

