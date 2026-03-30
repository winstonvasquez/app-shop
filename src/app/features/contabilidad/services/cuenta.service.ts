import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

export interface CuentaContable {
    id: string;
    codigo: string;
    nombre: string;
    tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'RESULTADO' | 'ANALITICA';
    nivel: number;
    aceptaMovimiento: boolean;
    estado: string;
}

@Injectable({ providedIn: 'root' })
export class CuentaService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/cuentas`;

    listarPorNivel(nivel: number) {
        return this.http.get<CuentaContable[]>(this.baseUrl, {
            params: new HttpParams().set('nivel', nivel.toString())
        });
    }

    listarTodas() {
        return this.http.get<CuentaContable[]>(`${this.baseUrl}/todas`);
    }

    buscarPorCodigo(codigo: string) {
        return this.http.get<CuentaContable>(`${this.baseUrl}/buscar`, {
            params: new HttpParams().set('codigo', codigo)
        });
    }
}
