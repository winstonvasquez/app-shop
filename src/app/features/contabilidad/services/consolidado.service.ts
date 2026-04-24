import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

export interface LineaConsolidada {
    codigo: string;
    nombre: string;
    porEmpresa: Record<string, number>;
    totalConsolidado: number;
}

export interface ConsolidadoReport {
    anno: number;
    empresas: string[];
    balance: Record<string, LineaConsolidada>;
    resultados: Record<string, LineaConsolidada>;
}

@Injectable({ providedIn: 'root' })
export class ConsolidadoService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/consolidado`;

    consolidar(anno: number, empresaIds: string[]) {
        let params = new HttpParams();
        empresaIds.forEach(id => params = params.append('empresaIds', id));
        return this.http.get<ConsolidadoReport>(`${this.base}/${anno}`, { params });
    }
}
