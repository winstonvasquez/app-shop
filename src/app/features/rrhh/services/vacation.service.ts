import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { LeaveBalance } from '../models/leave-balance.model';

export interface VacationRequest {
    id: number;
    tenantId: number;
    employeeId: number;
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    estado: 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'TOMADO' | 'CANCELADO';
    motivo?: string;
    aprobadoPor?: number;
    fechaAprobacion?: string;
    comentariosAprobacion?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface VacationRequestDto {
    employeeId: number;
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    motivo?: string;
}

export interface VacationApprovalDto {
    approved: boolean;
    comentarios?: string;
}

@Injectable({ providedIn: 'root' })
export class VacationService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/vacations`;

    private readonly _vacations = signal<VacationRequest[]>([]);
    private readonly _loading = signal(false);

    private readonly _balances = signal<LeaveBalance[]>([]);
    private readonly _balancesLoading = signal(false);

    readonly vacations = this._vacations.asReadonly();
    readonly loading = this._loading.asReadonly();

    readonly balances = this._balances.asReadonly();
    readonly balancesLoading = this._balancesLoading.asReadonly();

    async loadVacationsPaged(page: number, size: number, search?: string, estado?: string):
        Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        try {
            const params: Record<string, string> = { page: String(page), size: String(size) };
            if (search) params['search'] = search;
            if (estado) params['estado'] = estado;
            const res = await firstValueFrom(
                this.http.get<PageResponse<VacationRequest>>(`${this.baseUrl}/paged`, { params })
            );
            this._vacations.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } finally {
            this._loading.set(false);
        }
    }

    async loadVacations(): Promise<void> {
        this._loading.set(true);
        try {
            const vacations = await firstValueFrom(
                this.http.get<VacationRequest[]>(this.baseUrl)
            );
            this._vacations.set(vacations);
        } finally {
            this._loading.set(false);
        }
    }

    async createVacationRequest(request: VacationRequestDto): Promise<VacationRequest> {
        const vacation = await firstValueFrom(
            this.http.post<VacationRequest>(this.baseUrl, request)
        );
        this._vacations.update(list => [...list, vacation]);
        return vacation;
    }

    async approveOrReject(id: number, approval: VacationApprovalDto): Promise<VacationRequest> {
        const vacation = await firstValueFrom(
            this.http.put<VacationRequest>(`${this.baseUrl}/${id}/approve`, approval)
        );
        this._vacations.update(list =>
            list.map(v => v.id === id ? vacation : v)
        );
        return vacation;
    }

    // ── Leave Balance ──────────────────────────────────────────────────────

    /** Balance de vacaciones de un empleado. Si no existe balance para ese año, retorna null (404). */
    async getBalance(employeeId: number, year?: number): Promise<LeaveBalance | null> {
        const params: Record<string, string> = {};
        if (year != null) params['year'] = String(year);
        try {
            return await firstValueFrom(
                this.http.get<LeaveBalance>(`${this.baseUrl}/balance/${employeeId}`, { params })
            );
        } catch {
            return null;
        }
    }

    /** Lista los balances de todos los empleados para un año (default: año actual). */
    async getBalancesByYear(year?: number): Promise<LeaveBalance[]> {
        this._balancesLoading.set(true);
        try {
            const params: Record<string, string> = {};
            if (year != null) params['year'] = String(year);
            const balances = await firstValueFrom(
                this.http.get<LeaveBalance[]>(`${this.baseUrl}/balance`, { params })
            );
            this._balances.set(balances);
            return balances;
        } finally {
            this._balancesLoading.set(false);
        }
    }

    /** Genera el balance anual para todos los empleados activos. Retorna la cantidad de balances generados. */
    async generateAnnualBalance(year?: number): Promise<number> {
        const params: Record<string, string> = {};
        if (year != null) params['year'] = String(year);
        const res = await firstValueFrom(
            this.http.post<{ generated: number }>(`${this.baseUrl}/balance/generate`, null, { params })
        );
        return res.generated;
    }
}
