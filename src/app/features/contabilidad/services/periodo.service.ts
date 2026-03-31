import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface PeriodoContable {
    id: string;
    anno: number;
    mes: number;
    nombre: string;
    estado: 'ABIERTO' | 'CERRADO';
    fechaInicio: string;
    fechaFin: string;
    companyId: string;
}

@Injectable({ providedIn: 'root' })
export class PeriodoService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/periodos`;

    listar() {
        return this.http.get<PeriodoContable[]>(this.baseUrl);
    }

    actual() {
        return this.http.get<PeriodoContable>(`${this.baseUrl}/actual`);
    }
}
