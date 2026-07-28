import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { Payroll, PayrollRequest, PayrollStatus } from '../models/payroll.model';

/** Filtros server-side del listado paginado de boletas (GET /paged). Todos opcionales. */
export interface PayrollFiltros {
    page?: number;
    size?: number;
    periodo?: string;
    search?: string;
    estado?: PayrollStatus | string;
    employeeId?: number | null;
    departmentId?: number | null;
    afpOnp?: string;
    /** yyyy-MM-dd */
    fechaPagoDesde?: string;
    fechaPagoHasta?: string;
}

/**
 * Cliente HTTP de planillas — 1:1 con PayrollController (microshopusers, /hr/api/payroll).
 * Toda la lógica de cálculo peruana vive en el backend; aquí solo se orquesta.
 */
@Injectable({ providedIn: 'root' })
export class PayrollService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/payroll`;

    private readonly _payrolls = signal<Payroll[]>([]);
    private readonly _loading = signal(false);

    // Listado completo paginado (GET /paged) — signal INDEPENDIENTE de `_payrolls`
    // (que alimenta la tarjeta de generación por periodo) para que ambas secciones
    // de la pantalla de Nómina no se pisen entre sí al recargar.
    private readonly _payrollsPaged = signal<Payroll[]>([]);
    private readonly _pagedLoading = signal(false);

    readonly payrolls = this._payrolls.asReadonly();
    readonly loading = this._loading.asReadonly();

    readonly payrollsPaged = this._payrollsPaged.asReadonly();
    readonly pagedLoading = this._pagedLoading.asReadonly();

    /**
     * Listado completo de boletas con filtros avanzados server-side (GET /paged):
     * periodo, búsqueda, estado, empleado, departamento, sistema previsional/AFP
     * y rango de fecha de pago.
     */
    async loadPayrollPaged(filtros: PayrollFiltros = {}):
        Promise<{ totalElements: number; totalPages: number }> {
        this._pagedLoading.set(true);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.periodo) params['periodo'] = filtros.periodo;
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.estado) params['estado'] = filtros.estado;
            if (filtros.employeeId != null) params['employeeId'] = String(filtros.employeeId);
            if (filtros.departmentId != null) params['departmentId'] = String(filtros.departmentId);
            if (filtros.afpOnp) params['afpOnp'] = filtros.afpOnp;
            if (filtros.fechaPagoDesde) params['fechaPagoDesde'] = filtros.fechaPagoDesde;
            if (filtros.fechaPagoHasta) params['fechaPagoHasta'] = filtros.fechaPagoHasta;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Payroll>>(`${this.baseUrl}/paged`, { params })
            );
            this._payrollsPaged.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } finally {
            this._pagedLoading.set(false);
        }
    }

    /** Crea una planilla individual (POST /). */
    async createPayroll(request: PayrollRequest): Promise<Payroll> {
        this._loading.set(true);
        try {
            const payroll = await firstValueFrom(
                this.http.post<Payroll>(this.baseUrl, request)
            );
            this._payrolls.update(list => [...list, payroll]);
            return payroll;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Corrige una planilla ya persistida (PUT /{id}). Solo válido mientras la boleta está
     * en estado GENERADO — el backend responde 400 si ya está APROBADA/PAGADA/CANCELADA.
     */
    async updatePayroll(id: number, request: PayrollRequest): Promise<Payroll> {
        this._loading.set(true);
        try {
            const payroll = await firstValueFrom(
                this.http.put<Payroll>(`${this.baseUrl}/${id}`, request)
            );
            this._payrolls.update(list => list.map(p => p.id === payroll.id ? payroll : p));
            return payroll;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Genera (persiste) las planillas faltantes del periodo para todos los empleados
     * activos (POST /run). Es idempotente: no re-genera las ya existentes → devuelve
     * solo las nuevas. Para listar TODAS las del periodo usar getByPeriod tras generar.
     */
    async generatePayrollForPeriod(periodo: string): Promise<Payroll[]> {
        this._loading.set(true);
        try {
            return await firstValueFrom(
                this.http.post<Payroll[]>(`${this.baseUrl}/run`, null, { params: { periodo } })
            );
        } finally {
            this._loading.set(false);
        }
    }

    /** Lista las planillas persistidas de un periodo (GET /period/{periodo}). */
    async getByPeriod(periodo: string): Promise<Payroll[]> {
        this._loading.set(true);
        try {
            const payrolls = await firstValueFrom(
                this.http.get<Payroll[]>(`${this.baseUrl}/period/${periodo}`)
            );
            this._payrolls.set(payrolls);
            return payrolls;
        } finally {
            this._loading.set(false);
        }
    }

    /** Lista el historial de boletas de un empleado (GET /employee/{employeeId}). */
    async getByEmployee(employeeId: number): Promise<Payroll[]> {
        this._loading.set(true);
        try {
            const payrolls = await firstValueFrom(
                this.http.get<Payroll[]>(`${this.baseUrl}/employee/${employeeId}`)
            );
            this._payrolls.set(payrolls);
            return payrolls;
        } finally {
            this._loading.set(false);
        }
    }

    /** Obtiene una boleta por ID con su detalle completo (GET /{id}). */
    async getById(id: number): Promise<Payroll> {
        return firstValueFrom(this.http.get<Payroll>(`${this.baseUrl}/${id}`));
    }

    /**
     * Aprueba una planilla GENERADA (POST /{id}/approve). El backend dispara el pago
     * en tesorería y el asiento de provisión en contabilidad. Refresca la lista local.
     */
    async approvePayroll(id: number): Promise<Payroll> {
        const updated = await firstValueFrom(
            this.http.post<Payroll>(`${this.baseUrl}/${id}/approve`, null)
        );
        this.replaceInList(updated);
        return updated;
    }

    /** Marca una planilla APROBADA como PAGADA (POST /{id}/pay). Refresca la lista local. */
    async markAsPaid(id: number): Promise<Payroll> {
        const updated = await firstValueFrom(
            this.http.post<Payroll>(`${this.baseUrl}/${id}/pay`, null)
        );
        this.replaceInList(updated);
        return updated;
    }

    private replaceInList(payroll: Payroll): void {
        this._payrolls.update(list => list.map(p => p.id === payroll.id ? payroll : p));
    }
}
