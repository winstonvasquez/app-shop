import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Attendance, AttendanceRequest, CheckInOutRequest, AttendanceSummary } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/attendance`;

    private readonly _attendances = signal<Attendance[]>([]);
    private readonly _loading = signal(false);

    readonly attendances = this._attendances.asReadonly();
    readonly loading = this._loading.asReadonly();

    async registerAttendance(request: AttendanceRequest): Promise<Attendance> {
        this._loading.set(true);
        try {
            const attendance = await firstValueFrom(
                this.http.post<Attendance>(this.baseUrl, request)
            );
            this._attendances.update(list => [...list, attendance]);
            return attendance;
        } finally {
            this._loading.set(false);
        }
    }

    async checkIn(request: CheckInOutRequest): Promise<Attendance> {
        this._loading.set(true);
        try {
            const attendance = await firstValueFrom(
                this.http.post<Attendance>(`${this.baseUrl}/check-in`, request)
            );
            this._attendances.update(list => [...list, attendance]);
            return attendance;
        } finally {
            this._loading.set(false);
        }
    }

    async checkOut(request: CheckInOutRequest): Promise<Attendance> {
        this._loading.set(true);
        try {
            const attendance = await firstValueFrom(
                this.http.post<Attendance>(`${this.baseUrl}/check-out`, request)
            );
            this._attendances.update(list =>
                list.map(a => a.id === attendance.id ? attendance : a)
            );
            return attendance;
        } finally {
            this._loading.set(false);
        }
    }

    async getByDate(fecha: string): Promise<Attendance[]> {
        return firstValueFrom(
            this.http.get<Attendance[]>(`${this.baseUrl}/date/${fecha}`)
        );
    }

    async getByEmployee(employeeId: number): Promise<Attendance[]> {
        return firstValueFrom(
            this.http.get<Attendance[]>(`${this.baseUrl}/employee/${employeeId}`)
        );
    }

    async getMonthlyReport(employeeId: number, month: string): Promise<Attendance[]> {
        return firstValueFrom(
            this.http.get<Attendance[]>(`${this.baseUrl}/report`, { params: { employeeId, month } })
        );
    }

    async getMonthlySummary(month: string): Promise<AttendanceSummary[]> {
        return firstValueFrom(
            this.http.get<AttendanceSummary[]>(`${this.baseUrl}/summary`, { params: { month } })
        );
    }
}
