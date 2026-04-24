import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { SelfServiceService } from '../../services/self-service.service';
import { Employee } from '../../models/employee.model';
import { Evaluation } from '../../models/evaluation.model';
import { Goal, GOAL_STATUS_LABELS, GOAL_PRIORITY_LABELS } from '../../models/evaluation.model';

@Component({
    selector: 'app-portal',
    standalone: true,
    imports: [PageHeaderComponent, AlertComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal.component.html',
})
export class PortalComponent implements OnInit {
    private readonly selfService = inject(SelfServiceService);

    profile = signal<Employee | null>(null);
    evaluations = signal<Evaluation[]>([]);
    goals = signal<Goal[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Mi Portal' },
    ];

    goalStatusLabel(status: string): string {
        return GOAL_STATUS_LABELS[status as keyof typeof GOAL_STATUS_LABELS] || status;
    }

    goalPriorityLabel(priority: string): string {
        return GOAL_PRIORITY_LABELS[priority as keyof typeof GOAL_PRIORITY_LABELS] || priority;
    }

    async ngOnInit(): Promise<void> {
        try {
            const [profile, evaluations, goals] = await Promise.all([
                this.selfService.getProfile(),
                this.selfService.getEvaluations(),
                this.selfService.getGoals(),
            ]);
            this.profile.set(profile);
            this.evaluations.set(evaluations);
            this.goals.set(goals);
        } catch {
            this.error.set('No se pudo cargar el portal. Asegúrese de tener un empleado vinculado a su cuenta.');
        } finally {
            this.loading.set(false);
        }
    }
}
