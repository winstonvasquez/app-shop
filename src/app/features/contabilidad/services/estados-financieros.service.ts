import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface LineaBalance { codigo: string; nombre: string; monto: number; }
export interface BalanceGeneral {
    activos: LineaBalance[];
    pasivos: LineaBalance[];
    patrimonio: LineaBalance[];
    totalActivo: number;
    totalPasivoPlusPatrimonio: number;
}
export interface EstadoResultados {
    ingresos: LineaBalance[];
    gastos: LineaBalance[];
    utilidadNeta: number;
}
export interface FlujoEfectivo {
    flujoOperativo: number;
    flujoInversion: number;
    flujoFinanciamiento: number;
    flujoNeto: number;
}

@Injectable({ providedIn: 'root' })
export class EstadosFinancierosService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/estados-financieros`;

    balanceGeneral(anno: number) {
        return this.http.get<BalanceGeneral>(`${this.base}/balance-general/${anno}`);
    }
    estadoResultados(anno: number) {
        return this.http.get<EstadoResultados>(`${this.base}/estado-resultados/${anno}`);
    }
    flujoEfectivo(anno: number) {
        return this.http.get<FlujoEfectivo>(`${this.base}/flujo-efectivo/${anno}`);
    }
}
