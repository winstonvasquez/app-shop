import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../models/employee.model';
import { Evaluation } from '../models/evaluation.model';
import { Goal } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class SelfServiceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/self-service`;

    async getProfile(): Promise<Employee> {
        return firstValueFrom(this.http.get<Employee>(`${this.baseUrl}/profile`));
    }

    async getPayslips(): Promise<unknown[]> {
        return firstValueFrom(this.http.get<unknown[]>(`${this.baseUrl}/payslips`));
    }

    async getVacations(): Promise<unknown[]> {
        return firstValueFrom(this.http.get<unknown[]>(`${this.baseUrl}/vacations`));
    }

    async getAttendance(month: string): Promise<unknown[]> {
        return firstValueFrom(this.http.get<unknown[]>(`${this.baseUrl}/attendance`, { params: { month } }));
    }

    async getEvaluations(): Promise<Evaluation[]> {
        return firstValueFrom(this.http.get<Evaluation[]>(`${this.baseUrl}/evaluations`));
    }

    async getGoals(): Promise<Goal[]> {
        return firstValueFrom(this.http.get<Goal[]>(`${this.baseUrl}/goals`));
    }

    async getTrainings(): Promise<unknown[]> {
        return firstValueFrom(this.http.get<unknown[]>(`${this.baseUrl}/trainings`));
    }
}
