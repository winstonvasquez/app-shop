import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { TrainingService } from '../../services/training.service';
import { Training, TrainingStatus, TrainingParticipation } from '../../models/training.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';
import { EmployeeService } from '../../services/employee.service';
import { employeeSelectSource } from '../../components/select-sources';

/** Edits locales (no persistidos) de asistencia/nota/comentarios por participationId. */
interface ParticipantEdit {
    asistenciaPorcentaje: number | null;
    notaFinal: number | null;
    comentarios: string;
}

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
        ButtonComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './training-list.component.html',
})
export class TrainingListComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly trainingService = inject(TrainingService);
    private readonly catalog = inject(CatalogService);
    private readonly employeeService = inject(EmployeeService);

    /** Fuente server-side del search-select de empleado del formulario de inscripción. */
    readonly employeeSource = employeeSelectSource(this.employeeService);

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
    pageSize = signal<number>(PAGINATION.defaultPageSize);

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el filtro de estado actual). Ver /hr/api/trainings/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/trainings/export`,
        filename: 'capacitaciones',
        params: () => ({ estado: this.filtroEstado() }),
    };

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
            render: row => `<span class="badge badge-${this.badgeEstado(row.estado)}">${this.catalog.label('ESTADO_CAPACITACION', row.estado)}</span>`
        },
    ];

    actions: TableAction<Training>[] = [
        {
            label: 'Participantes', icon: '👥', class: 'btn-view',
            onClick: row => this.openParticipants(row),
        },
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

    // ── Drawer: Participantes ────────────────────────────────────────────────
    showParticipantsDrawer = signal(false);
    selectedTraining = signal<Training | null>(null);
    participants = signal<TrainingParticipation[]>([]);
    participantsLoading = signal(false);
    participantsError = signal<string | null>(null);

    enrolling = signal(false);
    enrollError = signal<string | null>(null);

    /** Edits locales de asistencia/nota/comentarios por participationId (antes de "Guardar"). */
    private readonly participantEdits = signal<Record<number, ParticipantEdit>>({});
    savingParticipationId = signal<number | null>(null);
    issuingCertificateId = signal<number | null>(null);

    readonly enrollForm = this.fb.group({
        employeeId: [null as number | null, Validators.required],
    });

    ngOnInit(): void {
        this.trainingService.loadTrainings();
    }

    readonly toolbarFilters: FilterConfig[] = [
        {
            field: 'estado', label: 'Todos los estados',
            options: toObservable(this.catalog.options('ESTADO_CAPACITACION')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            )
        }
    ];

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'estado') return;
        this.filtroEstado.set(event.value != null ? String(event.value) : '');
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

    getEnrollControl(name: string): FormControl {
        return this.enrollForm.get(name) as FormControl;
    }

    // ── Participantes ─────────────────────────────────────────────────────────

    openParticipants(t: Training): void {
        this.selectedTraining.set(t);
        this.enrollForm.reset();
        this.enrollError.set(null);
        this.participantsError.set(null);
        this.showParticipantsDrawer.set(true);
        this.loadParticipants();
    }

    closeParticipantsDrawer(): void {
        this.showParticipantsDrawer.set(false);
        this.selectedTraining.set(null);
        this.participants.set([]);
        this.participantEdits.set({});
    }

    private async loadParticipants(): Promise<void> {
        const training = this.selectedTraining();
        if (!training) return;
        this.participantsLoading.set(true);
        this.participantsError.set(null);
        try {
            const data = await this.trainingService.getParticipants(training.id);
            this.participants.set(data);
            this.initEdits(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al cargar participantes';
            this.participantsError.set(message);
        } finally {
            this.participantsLoading.set(false);
        }
    }

    private initEdits(list: TrainingParticipation[]): void {
        const edits: Record<number, ParticipantEdit> = {};
        for (const p of list) {
            edits[p.id] = {
                asistenciaPorcentaje: p.asistenciaPorcentaje,
                notaFinal: p.notaFinal,
                comentarios: p.comentarios ?? '',
            };
        }
        this.participantEdits.set(edits);
    }

    getEdit(participationId: number): ParticipantEdit {
        return this.participantEdits()[participationId] ?? { asistenciaPorcentaje: null, notaFinal: null, comentarios: '' };
    }

    setEditField(participationId: number, field: keyof ParticipantEdit, value: string): void {
        const current = this.getEdit(participationId);
        const next: ParticipantEdit = { ...current };
        if (field === 'comentarios') {
            next.comentarios = value;
        } else {
            next[field] = value === '' ? null : Number(value);
        }
        this.participantEdits.update(edits => ({ ...edits, [participationId]: next }));
    }

    async enrollParticipant(): Promise<void> {
        const training = this.selectedTraining();
        if (!training || this.enrollForm.invalid) {
            this.enrollForm.markAllAsTouched();
            return;
        }
        this.enrolling.set(true);
        this.enrollError.set(null);
        try {
            const employeeId = this.enrollForm.value.employeeId!;
            await this.trainingService.enrollParticipant({ trainingId: training.id, employeeId });
            this.enrollForm.reset();
            await this.loadParticipants();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al inscribir participante';
            this.enrollError.set(message);
        } finally {
            this.enrolling.set(false);
        }
    }

    async saveParticipation(p: TrainingParticipation): Promise<void> {
        const edit = this.getEdit(p.id);
        this.savingParticipationId.set(p.id);
        this.participantsError.set(null);
        try {
            const updated = await this.trainingService.updateParticipation(p.id, {
                trainingId: p.trainingId,
                employeeId: p.employeeId,
                asistenciaPorcentaje: edit.asistenciaPorcentaje ?? undefined,
                notaFinal: edit.notaFinal ?? undefined,
                comentarios: edit.comentarios || undefined,
            });
            this.participants.update(list => list.map(x => x.id === updated.id ? updated : x));
            this.participantEdits.update(edits => ({
                ...edits,
                [updated.id]: {
                    asistenciaPorcentaje: updated.asistenciaPorcentaje,
                    notaFinal: updated.notaFinal,
                    comentarios: updated.comentarios ?? '',
                },
            }));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al actualizar participación';
            this.participantsError.set(message);
        } finally {
            this.savingParticipationId.set(null);
        }
    }

    async issueCertificate(p: TrainingParticipation): Promise<void> {
        this.issuingCertificateId.set(p.id);
        this.participantsError.set(null);
        try {
            const updated = await this.trainingService.issueCertificate(p.id);
            this.participants.update(list => list.map(x => x.id === updated.id ? updated : x));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error al emitir certificado';
            this.participantsError.set(message);
        } finally {
            this.issuingCertificateId.set(null);
        }
    }

    canIssueCertificate(p: TrainingParticipation): boolean {
        return p.aprobado === true && !p.certificadoEmitido;
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

