import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { LeaveBalance } from '../models/leave-balance.model';
import { toHttpParams } from '@core/utils/http-params.util';

export type TipoVacacion = 'ANUAL' | 'TRUNCAS' | 'COMPENSATORIAS' | 'SIN_GOCE';

export interface VacationRequest {
    id: number;
    tenantId: number;
    employeeId: number;
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    estado: 'SOLICITADO' | 'APROBADO' | 'RECHAZADO' | 'TOMADO' | 'CANCELADO';
    tipoVacacion?: TipoVacacion;
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
    tipoVacacion?: TipoVacacion;
}

export interface VacationApprovalDto {
    approved: boolean;
    comentarios?: string;
}

/** Filtros server-side del listado paginado de vacaciones. Todos opcionales. */
export interface VacationFiltros {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    tipoVacacion?: string;
    employeeId?: number | null;
    departmentId?: number | null;
    aprobadoPorId?: number | null;
    /** yyyy-MM-dd */
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
    fechaAprobacionDesde?: string;
    fechaAprobacionHasta?: string;
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

    async loadVacationsPaged(filtros: VacationFiltros = {}):
        Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        try {
            let params = toHttpParams({
                page: filtros.page ?? 0,
                size: filtros.size ?? 20,
                search: filtros.search,
                estado: filtros.estado,
                tipoVacacion: filtros.tipoVacacion,
                employeeId: filtros.employeeId,
                departmentId: filtros.departmentId,
                aprobadoPorId: filtros.aprobadoPorId,
                fechaInicioDesde: filtros.fechaInicioDesde,
                fechaInicioHasta: filtros.fechaInicioHasta,
                fechaFinDesde: filtros.fechaFinDesde,
                fechaFinHasta: filtros.fechaFinHasta,
                fechaAprobacionDesde: filtros.fechaAprobacionDesde,
                fechaAprobacionHasta: filtros.fechaAprobacionHasta,
            });
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
        let params = toHttpParams({
            year,
        });
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
            let params = toHttpParams({
                year,
            });
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
        let params = toHttpParams({
            year,
        });
        const res = await firstValueFrom(
            this.http.post<{ generated: number }>(`${this.baseUrl}/balance/generate`, null, { params })
        );
        return res.generated;
    }
}
