import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface ValidacionCierreResult {
    valido: boolean;
    errores: string[];
    advertencias: string[];
    totalAsientos: number;
    asientosCuadrados: number;
}

export interface CierreResult {
    id: string;
    tipoCierre: 'MENSUAL' | 'ANUAL';
    periodoId: string;
    periodoNombre: string;
    fechaCierre: string;
    estado: string;
    asientosCerradosCount: number;
}

export interface CierreRequest {
    periodoId: string;
    motivo: string;
}

@Injectable({ providedIn: 'root' })
export class CierreContableService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/cierre`;

    validar(periodoId: string) {
        return this.http.post<ValidacionCierreResult>(`${this.base}/validar/${periodoId}`, {});
    }

    cierreMensual(request: CierreRequest) {
        return this.http.post<CierreResult>(`${this.base}/mensual`, request);
    }

    cierreAnual(request: CierreRequest) {
        return this.http.post<CierreResult>(`${this.base}/anual`, request);
    }

    reabrir(periodoId: string, motivo: string) {
        return this.http.post<void>(`${this.base}/reabrir/${periodoId}`, { motivo });
    }
}
