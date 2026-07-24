import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Payroll, PayrollRequest } from '../models/payroll.model';

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

    readonly payrolls = this._payrolls.asReadonly();
    readonly loading = this._loading.asReadonly();

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
