import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse } from '@core/models/pagination.model';
import { Attendance, AttendanceRequest, CheckInOutRequest, AttendanceSummary } from '../models/attendance.model';

/** Filtros server-side del listado paginado de asistencia. Todos opcionales. */
export interface AttendanceFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto sobre nombre/código de empleado y observaciones. */
    search?: string;
    employeeId?: number | null;
    departmentId?: number | null;
    tipoRegistro?: string;
    aprobadoPorId?: number | null;
    /** yyyy-MM-dd */
    fechaDesde?: string;
    fechaHasta?: string;
}

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

    /**
     * Listado paginado server-side (`GET /hr/api/attendance/paged`) con búsqueda, empleado,
     * departamento, tipo de registro, aprobador y rango de fechas. Reemplaza el filtrado
     * client-side que traía un único día completo a memoria.
     */
    async getAttendancePaged(filtros: AttendanceFiltros = {}): Promise<PageResponse<Attendance>> {
        this._loading.set(true);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 15),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.employeeId != null) params['employeeId'] = String(filtros.employeeId);
            if (filtros.departmentId != null) params['departmentId'] = String(filtros.departmentId);
            if (filtros.tipoRegistro) params['tipoRegistro'] = filtros.tipoRegistro;
            if (filtros.aprobadoPorId != null) params['aprobadoPorId'] = String(filtros.aprobadoPorId);
            if (filtros.fechaDesde) params['fechaDesde'] = filtros.fechaDesde;
            if (filtros.fechaHasta) params['fechaHasta'] = filtros.fechaHasta;
            return await firstValueFrom(
                this.http.get<PageResponse<Attendance>>(`${this.baseUrl}/paged`, { params })
            );
        } finally {
            this._loading.set(false);
        }
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
