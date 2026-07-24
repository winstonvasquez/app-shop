import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { CatalogService } from '@core/services/catalog.service';
import { SelfServiceService } from '../../services/self-service.service';
import { Employee } from '../../models/employee.model';
import { Evaluation, Goal, GOAL_STATUS_LABELS, GOAL_PRIORITY_LABELS } from '../../models/evaluation.model';
import { Payroll, PayrollStatus } from '../../models/payroll.model';
import { Attendance, AttendanceType } from '../../models/attendance.model';
import { TrainingParticipation, ParticipationStatus } from '../../models/training.model';
import { VacationRequest } from '../../services/vacation.service';

function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
    selector: 'app-portal',
    standalone: true,
    imports: [PageHeaderComponent, AlertComponent, ButtonComponent, DataTableComponent, DateInputComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal.component.html',
})
export class PortalComponent implements OnInit {
    private readonly selfService = inject(SelfServiceService);
    private readonly catalog = inject(CatalogService);

    profile = signal<Employee | null>(null);
    evaluations = signal<Evaluation[]>([]);
    goals = signal<Goal[]>([]);
    payslips = signal<Payroll[]>([]);
    vacations = signal<VacationRequest[]>([]);
    attendance = signal<Attendance[]>([]);
    trainings = signal<TrainingParticipation[]>([]);

    loading = signal(true);
    error = signal<string | null>(null);

    // ── Mi Asistencia (mes) ───────────────────────────────────────────────
    attendanceMonth = signal<string>(currentMonth());
    attendanceLoading = signal(false);

    // ── Mis Vacaciones: solicitar (form basado en signals, no reactive forms) ──
    showVacationForm = signal(false);
    vacationSubmitting = signal(false);
    vacationError = signal<string | null>(null);

    vacFechaInicio = signal('');
    vacFechaFin = signal('');
    vacMotivo = signal('');

    diasSolicitados = computed(() => {
        const inicio = this.vacFechaInicio();
        const fin = this.vacFechaFin();
        if (!inicio || !fin) return 0;
        const d1 = new Date(inicio);
        const d2 = new Date(fin);
        const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        return diff > 0 ? diff : 0;
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Mi Portal' },
    ];

    // ── Columnas de tablas ────────────────────────────────────────────────
    payslipColumns: TableColumn<Payroll>[] = [
        { key: 'periodo', label: 'Período' },
        { key: 'sueldoBase', label: 'Sueldo Base', align: 'right', render: p => `S/ ${p.sueldoBase.toFixed(2)}` },
        { key: 'neto', label: 'Neto', align: 'right', render: p => `S/ ${p.neto.toFixed(2)}` },
        {
            key: 'estado', label: 'Estado', html: true,
            render: p => `<span class="badge badge-${this.payrollBadge(p.estado)}">${p.estado}</span>`,
        },
        { key: 'fechaPago', label: 'Fecha de Pago', render: p => p.fechaPago ?? '—' },
    ];

    vacationColumns: TableColumn<VacationRequest>[] = [
        { key: 'fechaInicio', label: 'Fecha Inicio' },
        { key: 'fechaFin', label: 'Fecha Fin' },
        { key: 'dias', label: 'Días', align: 'center', render: v => `${v.dias} día${v.dias === 1 ? '' : 's'}` },
        { key: 'motivo', label: 'Motivo', render: v => v.motivo ?? '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: v => `<span class="badge badge-${this.vacationBadge(v.estado)}">${this.catalog.label('ESTADO_VACACION', v.estado)}</span>`,
        },
    ];

    attendanceColumns: TableColumn<Attendance>[] = [
        { key: 'fecha', label: 'Fecha' },
        { key: 'horaEntrada', label: 'Entrada', render: a => a.horaEntrada ?? '—' },
        { key: 'horaSalida', label: 'Salida', render: a => a.horaSalida ?? '—' },
        { key: 'horasTrabajadas', label: 'Horas', align: 'right', render: a => a.horasTrabajadas?.toString() ?? '—' },
        {
            key: 'tipoRegistro', label: 'Tipo', html: true,
            render: a => `<span class="badge badge-${this.attendanceBadge(a.tipoRegistro)}">${this.catalog.label('TIPO_REGISTRO_ASISTENCIA', a.tipoRegistro)}</span>`,
        },
    ];

    trainingColumns: TableColumn<TrainingParticipation>[] = [
        { key: 'trainingName', label: 'Capacitación', render: t => t.trainingName ?? '—' },
        { key: 'fechaInscripcion', label: 'Inscripción' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: t => `<span class="badge badge-${this.trainingBadge(t.estado)}">${this.trainingLabel(t.estado)}</span>`,
        },
        { key: 'asistenciaPorcentaje', label: 'Asistencia', align: 'right', render: t => t.asistenciaPorcentaje != null ? `${t.asistenciaPorcentaje}%` : '—' },
        { key: 'notaFinal', label: 'Nota', align: 'right', render: t => t.notaFinal != null ? `${t.notaFinal}` : '—' },
    ];

    goalStatusLabel(status: string): string {
        return GOAL_STATUS_LABELS[status as keyof typeof GOAL_STATUS_LABELS] || status;
    }

    goalPriorityLabel(priority: string): string {
        return GOAL_PRIORITY_LABELS[priority as keyof typeof GOAL_PRIORITY_LABELS] || priority;
    }

    payrollBadge(estado: PayrollStatus): string {
        switch (estado) {
            case 'GENERADO': return 'info';
            case 'APROBADO': return 'warning';
            case 'PAGADO': return 'success';
            case 'CANCELADO': return 'error';
            default: return 'neutral';
        }
    }

    vacationBadge(estado: VacationRequest['estado']): string {
        const map: Record<VacationRequest['estado'], string> = {
            SOLICITADO: 'warning',
            APROBADO: 'success',
            RECHAZADO: 'error',
            TOMADO: 'neutral',
            CANCELADO: 'neutral',
        };
        return map[estado] ?? 'neutral';
    }

    attendanceBadge(tipo: AttendanceType): string {
        const map: Record<AttendanceType, string> = {
            NORMAL: 'success',
            TARDANZA: 'warning',
            FALTA: 'error',
            PERMISO: 'neutral',
            LICENCIA: 'neutral',
            VACACIONES: 'accent',
        };
        return map[tipo] ?? 'neutral';
    }

    trainingBadge(estado: ParticipationStatus): string {
        const map: Record<ParticipationStatus, string> = {
            INSCRITO: 'info',
            EN_CURSO: 'warning',
            COMPLETADO: 'success',
            ABANDONADO: 'neutral',
            REPROBADO: 'error',
        };
        return map[estado] ?? 'neutral';
    }

    trainingLabel(estado: ParticipationStatus): string {
        const map: Record<ParticipationStatus, string> = {
            INSCRITO: 'Inscrito',
            EN_CURSO: 'En Curso',
            COMPLETADO: 'Completado',
            ABANDONADO: 'Abandonado',
            REPROBADO: 'Reprobado',
        };
        return map[estado] ?? estado;
    }

    diasSolicitadosLabel(): string {
        const dias = this.diasSolicitados();
        return dias > 0 ? `${dias} día${dias === 1 ? '' : 's'}` : '—';
    }

    async ngOnInit(): Promise<void> {
        try {
            const [profile, evaluations, goals, payslips, vacations, trainings] = await Promise.all([
                this.selfService.getProfile(),
                this.selfService.getEvaluations(),
                this.selfService.getGoals(),
                this.selfService.getPayslips(),
                this.selfService.getVacations(),
                this.selfService.getTrainings(),
            ]);
            this.profile.set(profile);
            this.evaluations.set(evaluations);
            this.goals.set(goals);
            this.payslips.set(payslips);
            this.vacations.set(vacations);
            this.trainings.set(trainings);
            await this.loadAttendance();
        } catch {
            this.error.set('No se pudo cargar el portal. Asegúrese de tener un empleado vinculado a su cuenta.');
        } finally {
            this.loading.set(false);
        }
    }

    async loadAttendance(): Promise<void> {
        this.attendanceLoading.set(true);
        try {
            const data = await this.selfService.getAttendance(this.attendanceMonth());
            this.attendance.set(data);
        } catch {
            this.attendance.set([]);
        } finally {
            this.attendanceLoading.set(false);
        }
    }

    onMonthChange(value: string): void {
        if (!value) return;
        this.attendanceMonth.set(value);
        this.loadAttendance();
    }

    openVacationForm(): void {
        this.vacFechaInicio.set('');
        this.vacFechaFin.set('');
        this.vacMotivo.set('');
        this.vacationError.set(null);
        this.showVacationForm.set(true);
    }

    closeVacationForm(): void {
        this.showVacationForm.set(false);
    }

    async onSubmitVacation(): Promise<void> {
        if (!this.vacFechaInicio() || !this.vacFechaFin() || this.diasSolicitados() <= 0) {
            this.vacationError.set('Verifique las fechas: la fecha fin debe ser posterior a la fecha inicio.');
            return;
        }
        const emp = this.profile();
        if (!emp) return;

        this.vacationSubmitting.set(true);
        this.vacationError.set(null);
        try {
            const created = await this.selfService.requestVacation({
                employeeId: emp.id,
                fechaInicio: this.vacFechaInicio(),
                fechaFin: this.vacFechaFin(),
                dias: this.diasSolicitados(),
                motivo: this.vacMotivo() || undefined,
            });
            this.vacations.set([created, ...this.vacations()]);
            this.closeVacationForm();
        } catch (err) {
            this.vacationError.set((err as Error).message ?? 'Error al crear la solicitud de vacaciones');
        } finally {
            this.vacationSubmitting.set(false);
        }
    }
}
