import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

/** Espejo de `PartidaFinancieraDto` (backend). */
export interface LineaBalance { codigo: string; nombre: string; saldo: number; }
/** Espejo de `BalanceGeneralDto`. */
export interface BalanceGeneral {
    anno: number;
    activos: LineaBalance[];
    pasivos: LineaBalance[];
    patrimonio: LineaBalance[];
    totalActivos: number;
    totalPasivos: number;
    totalPatrimonio: number;
}
/** Espejo de `EstadoResultadosDto`. `gastos` es toda la clase 6 (incluye el costo de ventas 69). */
export interface EstadoResultados {
    anno: number;
    ingresos: LineaBalance[];
    gastos: LineaBalance[];
    totalIngresos: number;
    totalGastos: number;
    utilidadBruta: number;
    utilidadNeta: number;
}
/** Espejo de `FlujoEfectivoDto`. */
export interface FlujoEfectivo {
    anno: number;
    operacion: LineaBalance[];
    inversion: LineaBalance[];
    financiamiento: LineaBalance[];
    flujoOperacion: number;
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
