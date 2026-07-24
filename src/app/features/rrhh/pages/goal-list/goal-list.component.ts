import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { EvaluationService } from '../../services/evaluation.service';
import { EmployeeService } from '../../services/employee.service';
import {
    Goal,
    GoalStatus,
    GoalPriority,
    GOAL_STATUS_LABELS,
    GOAL_PRIORITY_LABELS,
} from '../../models/evaluation.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Component({
    selector: 'app-goal-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
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

    readonly goals = this.evaluationService.goals;
    readonly loading = this.evaluationService.loading;
    /** Fuente server-side del search-select de empleado. */
    readonly employeeSource = employeeSelectSource(this.employeeService);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showProgressDrawer = signal(false);
    progressGoal = signal<Goal | null>(null);
    progressSubmitting = signal(false);
    progressError = signal<string | null>(null);

    filtroEstado = signal('');
    filtroPrioridad = signal('');
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);

    readonly statusOptions = Object.entries(GOAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
    readonly priorityOptions = Object.entries(GOAL_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

    readonly filtered = computed(() => {
        let list = this.goals();
        const estado = this.filtroEstado();
        const prioridad = this.filtroPrioridad();
        if (estado) list = list.filter(g => g.estado === estado);
        if (prioridad) list = list.filter(g => g.prioridad === prioridad);
        return list;
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);
    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    readonly enProgreso = computed(() => this.goals().filter(g => g.estado === 'EN_PROGRESO').length);
    readonly completadas = computed(() => this.goals().filter(g => g.estado === 'COMPLETADO').length);
    readonly retrasadas = computed(() => this.goals().filter(g => g.estado === 'RETRASADO').length);

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
            render: row => `<span class="badge badge-${this.badgePrioridad(row.prioridad)}">${GOAL_PRIORITY_LABELS[row.prioridad] ?? row.prioridad}</span>`
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
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${GOAL_STATUS_LABELS[row.estado] ?? row.estado}</span>`
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

    readonly progressControl = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(100)] });

    ngOnInit(): void {
        this.evaluationService.loadGoals();
        // El select de empleado carga sus opciones bajo demanda (server-side).
    }

    readonly toolbarFilters: FilterConfig[] = [
        { field: 'estado', label: 'Todos los estados', options: of(this.statusOptions) },
        { field: 'prioridad', label: 'Todas las prioridades', options: of(this.priorityOptions) },
    ];

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const v = event.value != null ? String(event.value) : '';
        if (event.field === 'estado') this.filtroEstado.set(v);
        else if (event.field === 'prioridad') this.filtroPrioridad.set(v);
        else return;
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreate(): void {
        this.goalForm.reset({ prioridad: 'MEDIA', porcentajeAvance: 0 });
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
            const val = this.goalForm.value;
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al actualizar progreso';
            this.progressError.set(message);
        } finally {
            this.progressSubmitting.set(false);
        }
    }

    async complete(goal: Goal): Promise<void> {
        await this.evaluationService.completeGoal(goal.id);
    }

    async cancel(goal: Goal): Promise<void> {
        await this.evaluationService.cancelGoal(goal.id);
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
