import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { Payroll, PayrollRequest } from '../models/payroll.model';

@Injectable({ providedIn: 'root' })
export class PayrollService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/hr/api/payroll`;

    private readonly _payrolls = signal<Payroll[]>([]);
    private readonly _loading = signal(false);

    readonly payrolls = this._payrolls.asReadonly();
    readonly loading = this._loading.asReadonly();

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

    async generatePayrollForPeriod(periodo: string): Promise<Payroll[]> {
        this._loading.set(true);
        try {
            const payrolls = await firstValueFrom(
                this.http.post<Payroll[]>(`${this.baseUrl}/run`, null, { params: { periodo } })
            );
            this._payrolls.set(payrolls);
            return payrolls;
        } finally {
            this._loading.set(false);
        }
    }
}
