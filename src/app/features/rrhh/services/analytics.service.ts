import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

export interface HrAnalytics {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    headcountByDepartment: Record<string, number>;
    todayAttendance: number;
    attendanceRate: number;
    totalPayrollCost: number;
    averageSalary: number;
    activeContracts: number;
    expiringContracts30Days: number;
    activeTrainings: number;
    completedTrainings: number;
    totalTrainingHours: number;
    pendingEvaluations: number;
    completedEvaluations: number;
    averageScore: number;
    pendingVacationRequests: number;
    activeGoals: number;
    completedGoals: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/analytics`;

    private readonly _analytics = signal<HrAnalytics | null>(null);
    private readonly _loading = signal(false);

    readonly analytics = this._analytics.asReadonly();
    readonly loading = this._loading.asReadonly();

    async loadDashboard(): Promise<void> {
        this._loading.set(true);
        try {
            const data = await firstValueFrom(this.http.get<HrAnalytics>(`${this.baseUrl}/dashboard`));
            this._analytics.set(data);
        } catch {
            // silently fail — dashboard shows zeros
        } finally {
            this._loading.set(false);
        }
    }
}
