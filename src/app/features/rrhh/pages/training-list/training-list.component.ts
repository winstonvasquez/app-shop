import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { TrainingService } from '../../services/training.service';
import { Training, TRAINING_STATUS_LABELS, TrainingStatus } from '../../models/training.model';

@Component({
    selector: 'app-training-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
    ],
    templateUrl: './training-list.component.html',
})
export class TrainingListComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly trainingService = inject(TrainingService);

    readonly trainings = this.trainingService.trainings;
    readonly loading = this.trainingService.loading;
    readonly planificadas = this.trainingService.planificadas;
    readonly enCurso = this.trainingService.enCurso;
    readonly completadas = this.trainingService.completadas;
    readonly totalHoras = this.trainingService.totalHoras;

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    filtroEstado = signal('');
    currentPage = signal(0);
    pageSize = signal(10);

    readonly filtered = computed(() => {
        const f = this.filtroEstado();
        return f ? this.trainings().filter(c => c.estado === f) : this.trainings();
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);
    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Capacitaciones' },
    ];

    readonly estadoOptions = [
        { value: 'PLANIFICADO', label: 'Planificado' },
        { value: 'EN_CURSO', label: 'En Curso' },
        { value: 'COMPLETADO', label: 'Completado' },
        { value: 'CANCELADO', label: 'Cancelado' },
    ];

    columns: TableColumn<Training>[] = [
        { key: 'nombre', label: 'Curso' },
        { key: 'instructor', label: 'Instructor', render: row => row.instructor || '—' },
        {
            key: 'fechaInicio', label: 'Inicio',
            render: row => new Date(row.fechaInicio + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'fechaFin', label: 'Fin',
            render: row => new Date(row.fechaFin + 'T00:00').toLocaleDateString('es-PE')
        },
        { key: 'duracionHoras', label: 'Horas', align: 'center', render: row => row.duracionHoras ? `${row.duracionHoras}h` : '—' },
        { key: 'participantes', label: 'Partic.', align: 'center', render: row => `${row.participantes}` },
        {
            key: 'estado', label: 'Estado', html: true,
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${TRAINING_STATUS_LABELS[row.estado]}</span>`
        },
    ];

    actions: TableAction<Training>[] = [
        {
            label: 'Editar', icon: '✎', class: 'btn-view',
            show: row => row.estado === 'PLANIFICADO',
            onClick: row => this.openEdit(row),
        },
        {
            label: 'Iniciar', icon: '▶', class: 'btn-view',
            show: row => row.estado === 'PLANIFICADO',
            onClick: row => this.start(row),
        },
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'EN_CURSO',
            onClick: row => this.complete(row),
        },
        {
            label: 'Cancelar', icon: '✕', class: 'btn-icon-delete',
            show: row => row.estado !== 'CANCELADO' && row.estado !== 'COMPLETADO',
            onClick: row => this.cancel(row),
        },
    ];

    readonly form = this.fb.group({
        nombre: ['', Validators.required],
        descripcion: [''],
        instructor: [''],
        fechaInicio: ['', Validators.required],
        fechaFin: [''],
        duracionHoras: [0, [Validators.required, Validators.min(1)]],
    });

    ngOnInit(): void {
        this.trainingService.loadTrainings();
    }

    onFilterEstado(event: Event): void {
        this.filtroEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreate(): void {
        this.form.reset({ duracionHoras: 0 });
        this.editMode.set(false);
        this.selectedId.set(null);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(t: Training): void {
        this.form.patchValue({
            nombre: t.nombre,
            descripcion: t.descripcion || '',
            instructor: t.instructor || '',
            fechaInicio: t.fechaInicio,
            fechaFin: t.fechaFin,
            duracionHoras: t.duracionHoras || 0,
        });
        this.editMode.set(true);
        this.selectedId.set(t.id);
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.form.reset();
    }

    async guardar(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.form.value;
            const request = {
                nombre: val.nombre!,
                descripcion: val.descripcion || undefined,
                instructor: val.instructor || undefined,
                fechaInicio: val.fechaInicio!,
                fechaFin: val.fechaFin || val.fechaInicio!,
                duracionHoras: val.duracionHoras || undefined,
            };
            if (this.editMode() && this.selectedId()) {
                await this.trainingService.updateTraining(this.selectedId()!, request);
            } else {
                await this.trainingService.createTraining(request);
            }
            this.closeDrawer();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al guardar capacitación';
            this.submitError.set(message);
        } finally {
            this.submitting.set(false);
        }
    }

    async start(t: Training): Promise<void> {
        await this.trainingService.startTraining(t.id);
    }

    async complete(t: Training): Promise<void> {
        await this.trainingService.completeTraining(t.id);
    }

    async cancel(t: Training): Promise<void> {
        await this.trainingService.cancelTraining(t.id);
    }

    getControl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }

    badgeEstado(estado: TrainingStatus): string {
        const map: Record<TrainingStatus, string> = {
            PLANIFICADO: 'warning',
            EN_CURSO: 'accent',
            COMPLETADO: 'success',
            CANCELADO: 'neutral',
        };
        return map[estado] ?? 'neutral';
    }
}
