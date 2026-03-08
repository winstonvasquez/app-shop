import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Attendance, AttendanceRequest } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/hr/api/attendance`;

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
}
