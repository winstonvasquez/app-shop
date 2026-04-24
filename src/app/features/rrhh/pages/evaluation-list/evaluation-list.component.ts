import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { EvaluationService } from '../../services/evaluation.service';
import { EmployeeService } from '../../services/employee.service';
import {
    Evaluation,
    EvaluationStatus,
    EVALUATION_STATUS_LABELS,
    EVALUATION_TYPE_LABELS,
    EvaluationType,
} from '../../models/evaluation.model';

@Component({
    selector: 'app-evaluation-list',
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
    ],
    templateUrl: './evaluation-list.component.html',
})
export class EvaluationListComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly evaluationService = inject(EvaluationService);
    private readonly employeeService = inject(EmployeeService);

    readonly evaluations = this.evaluationService.evaluations;
    readonly loading = this.evaluationService.loading;

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    filtroEstado = signal('');
    filtroTipo = signal('');
    currentPage = signal(0);
    pageSize = signal(10);

    readonly filtered = computed(() => {
        let list = this.evaluations();
        const estado = this.filtroEstado();
        const tipo = this.filtroTipo();
        if (estado) list = list.filter(e => e.estado === estado);
        if (tipo) list = list.filter(e => e.tipoEvaluacion === tipo);
        return list;
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);
    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    readonly borradores = computed(() => this.evaluations().filter(e => e.estado === 'BORRADOR').length);
    readonly completadas = computed(() => this.evaluations().filter(e => e.estado === 'COMPLETADA' || e.estado === 'APROBADA').length);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Evaluaciones' },
    ];

    readonly estadoOptions = [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'COMPLETADA', label: 'Completada' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'CANCELADA', label: 'Cancelada' },
    ];

    readonly tipoOptions = [
        { value: 'ANUAL', label: 'Anual' },
        { value: 'SEMESTRAL', label: 'Semestral' },
        { value: 'TRIMESTRAL', label: 'Trimestral' },
        { value: 'PERIODO_PRUEBA', label: 'Periodo de Prueba' },
        { value: 'PROMOCION', label: 'Promoción' },
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
            render: row => EVALUATION_TYPE_LABELS[row.tipoEvaluacion] || row.tipoEvaluacion
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
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${EVALUATION_STATUS_LABELS[row.estado]}</span>`
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
        periodo: ['', Validators.required],
        tipoEvaluacion: ['ANUAL'],
        puntaje: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        fechaEvaluacion: ['', Validators.required],
        comentarios: [''],
        fortalezas: [''],
        areasMejora: [''],
        planMejora: [''],
    });

    ngOnInit(): void {
        this.evaluationService.loadEvaluations();
        this.employeeService.loadEmployees();
    }

    onFilterEstado(event: Event): void {
        this.filtroEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onFilterTipo(event: Event): void {
        this.filtroTipo.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreate(): void {
        this.evaluationForm.reset({ tipoEvaluacion: 'ANUAL', puntaje: 0 });
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
        this.editMode.set(true);
        this.selectedId.set(ev.id);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.evaluationForm.reset();
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
            };
            if (this.editMode() && this.selectedId()) {
                await this.evaluationService.updateEvaluation(this.selectedId()!, request);
            } else {
                await this.evaluationService.createEvaluation(request);
            }
            this.closeDrawer();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al guardar evaluación';
            this.submitError.set(message);
        } finally {
            this.submitting.set(false);
        }
    }

    async complete(ev: Evaluation): Promise<void> {
        await this.evaluationService.completeEvaluation(ev.id);
    }

    async approve(ev: Evaluation): Promise<void> {
        await this.evaluationService.approveEvaluation(ev.id);
    }

    async cancel(ev: Evaluation): Promise<void> {
        await this.evaluationService.cancelEvaluation(ev.id);
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
