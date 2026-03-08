import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { VacationService } from '../../services/vacation.service';

@Component({
    selector: 'app-rrhh-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink
    ],
    template: `
        <div class="dashboard-container">
            <h1>Dashboard RRHH</h1>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="card-header">
                        <span class="icon">👥</span>
                        <h3>Total Empleados</h3>
                    </div>
                    <div class="card-content">
                        <div class="stat-value">{{ totalEmployees() }}</div>
                        <div class="stat-label">Activos: {{ activeEmployees() }}</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-link" routerLink="/rrhh/employees">Ver empleados</button>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="card-header">
                        <span class="icon">📅</span>
                        <h3>Asistencia Hoy</h3>
                    </div>
                    <div class="card-content">
                        <div class="stat-value">{{ attendanceToday() }}</div>
                        <div class="stat-label">Registros del día</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-link" routerLink="/rrhh/attendance">Ver asistencia</button>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="card-header">
                        <span class="icon">🏖️</span>
                        <h3>Vacaciones Pendientes</h3>
                    </div>
                    <div class="card-content">
                        <div class="stat-value">{{ pendingVacations() }}</div>
                        <div class="stat-label">Solicitudes por aprobar</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-link" routerLink="/rrhh/vacations">Ver solicitudes</button>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="card-header">
                        <span class="icon">📊</span>
                        <h3>Próximas Evaluaciones</h3>
                    </div>
                    <div class="card-content">
                        <div class="stat-value">{{ upcomingEvaluations() }}</div>
                        <div class="stat-label">Este mes</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-link" routerLink="/rrhh/evaluations">Ver evaluaciones</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .dashboard-container {
            padding: 24px;
        }

        h1 {
            margin-bottom: 24px;
            font-size: 28px;
            font-weight: 500;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
        }

        .stat-card {
            mat-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;

                mat-icon {
                    font-size: 32px;
                    width: 32px;
                    height: 32px;
                    color: var(--primary-color);
                }
            }

            .stat-value {
                font-size: 48px;
                font-weight: 700;
                color: var(--primary-color);
                line-height: 1;
            }

            .stat-label {
                margin-top: 8px;
                color: var(--text-secondary);
                font-size: 14px;
            }
        }
    `]
})
export class DashboardComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly vacationService = inject(VacationService);

    readonly totalEmployees = signal(0);
    readonly activeEmployees = signal(0);
    readonly attendanceToday = signal(0);
    readonly pendingVacations = signal(0);
    readonly upcomingEvaluations = signal(0);

    async ngOnInit(): Promise<void> {
        await this.loadDashboardData();
    }

    private async loadDashboardData(): Promise<void> {
        try {
            await Promise.all([
                this.employeeService.loadEmployees(),
                this.vacationService.loadVacations()
            ]);

            this.totalEmployees.set(this.employeeService.totalEmployees());
            this.activeEmployees.set(this.employeeService.activeEmployees().length);
            
            const vacations = this.vacationService.vacations();
            this.pendingVacations.set(
                vacations.filter(v => v.estado === 'SOLICITADO').length
            );
        } catch (error) {
            console.error('Error al cargar datos del dashboard', error);
        }
    }
}
