import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface PDT621 {
    ventasGravadas: number;
    igvVentas: number;
    comprasGravadas: number;
    igvCompras: number;
    igvNeto: number;
    rentaBase: number;
    rentaMensual: number;
    totalAPagar: number;
}

export interface DeclaracionRequest {
    periodoId: string;
    regimenRenta: 'RMT' | 'MYPE' | 'GENERAL';
    coeficienteRenta: number;
}

export interface HistorialDeclaracion extends PDT621 {
    id: string;
    periodoId: string;
    periodoNombre: string;
    fechaDeclaracion: string;
    estado: string;
}

@Injectable({ providedIn: 'root' })
export class DeclaracionIgvService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/declaracion-igv`;

    calcular(request: DeclaracionRequest) {
        return this.http.post<PDT621>(`${this.base}/calcular`, request);
    }
    guardar(request: DeclaracionRequest) {
        return this.http.post<PDT621>(`${this.base}/guardar`, request);
    }
    historial() {
        return this.http.get<HistorialDeclaracion[]>(`${this.base}/historial`);
    }
    porPeriodo(periodoId: string) {
        return this.http.get<PDT621>(`${this.base}/periodo/${periodoId}`);
    }
}
