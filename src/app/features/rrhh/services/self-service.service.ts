import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../models/employee.model';
import { Evaluation, Goal } from '../models/evaluation.model';
import { Payroll } from '../models/payroll.model';
import { Attendance } from '../models/attendance.model';
import { TrainingParticipation } from '../models/training.model';
import { VacationRequest, VacationRequestDto } from './vacation.service';

@Injectable({ providedIn: 'root' })
export class SelfServiceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/self-service`;

    async getProfile(): Promise<Employee> {
        return firstValueFrom(this.http.get<Employee>(`${this.baseUrl}/profile`));
    }

    async getPayslips(): Promise<Payroll[]> {
        return firstValueFrom(this.http.get<Payroll[]>(`${this.baseUrl}/payslips`));
    }

    async getVacations(): Promise<VacationRequest[]> {
        return firstValueFrom(this.http.get<VacationRequest[]>(`${this.baseUrl}/vacations`));
    }

    async requestVacation(request: VacationRequestDto): Promise<VacationRequest> {
        return firstValueFrom(this.http.post<VacationRequest>(`${this.baseUrl}/vacations`, request));
    }

    async getAttendance(month: string): Promise<Attendance[]> {
        return firstValueFrom(this.http.get<Attendance[]>(`${this.baseUrl}/attendance`, { params: { month } }));
    }

    async getEvaluations(): Promise<Evaluation[]> {
        return firstValueFrom(this.http.get<Evaluation[]>(`${this.baseUrl}/evaluations`));
    }

    async getGoals(): Promise<Goal[]> {
        return firstValueFrom(this.http.get<Goal[]>(`${this.baseUrl}/goals`));
    }

    async getTrainings(): Promise<TrainingParticipation[]> {
        return firstValueFrom(this.http.get<TrainingParticipation[]>(`${this.baseUrl}/trainings`));
    }
}
