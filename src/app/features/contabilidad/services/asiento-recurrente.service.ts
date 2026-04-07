import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface RecurringLineItem {
    accountCode: string;
    movementType: 'DEBE' | 'HABER';
    amount: number;
}

export interface AsientoRecurrente {
    id: string;
    name: string;
    description: string;
    frequency: 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
    executionDay: number;
    startDate: string;
    endDate: string | null;
    nextExecution: string;
    lastExecution: string | null;
    active: boolean;
    templateGloss: string;
    templateLines: RecurringLineItem[];
    createdAt: string;
}

export interface AsientoRecurrenteRequest {
    name: string;
    description: string;
    frequency: string;
    executionDay: number;
    startDate: string;
    endDate: string | null;
    templateGloss: string;
    templateLines: RecurringLineItem[];
}

@Injectable({ providedIn: 'root' })
export class AsientoRecurrenteService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/asientos-recurrentes`;

    listar() {
        return this.http.get<AsientoRecurrente[]>(this.baseUrl);
    }

    obtener(id: string) {
        return this.http.get<AsientoRecurrente>(`${this.baseUrl}/${id}`);
    }

    crear(request: AsientoRecurrenteRequest) {
        return this.http.post<AsientoRecurrente>(this.baseUrl, request);
    }

    ejecutarAhora(id: string) {
        return this.http.post<AsientoRecurrente>(`${this.baseUrl}/${id}/execute`, {});
    }

    desactivar(id: string) {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
