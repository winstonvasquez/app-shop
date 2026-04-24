import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

export interface TipoCambio {
    id: string;
    fecha: string;
    moneda: string;
    compra: number;
    venta: number;
    fuente: string;
}

export interface TipoCambioRequest {
    fecha: string;
    moneda: string;
    compra: number;
    venta: number;
}

@Injectable({ providedIn: 'root' })
export class TipoCambioService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/tipo-cambio`;

    obtener(fecha: string, moneda: string) {
        const params = new HttpParams().set('fecha', fecha).set('moneda', moneda);
        return this.http.get<TipoCambio>(this.base, { params });
    }

    registrar(request: TipoCambioRequest) {
        return this.http.post<TipoCambio>(this.base, request);
    }
}
