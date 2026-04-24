import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

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

    readonly vacations = this._vacations.asReadonly();
    readonly loading = this._loading.asReadonly();

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
}
