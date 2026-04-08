import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

export interface AgingBucket {
    etiqueta: string;
    monto: number;
    cantidadDocumentos: number;
}

export interface AgingDetalle {
    documentoTipo: string;
    documentoNumero: string;
    documentoFecha: string;
    glosa: string;
    diasVencido: number;
    saldoPendiente: number;
}

export interface AgingReport {
    totalPendiente: number;
    buckets: AgingBucket[];
    detalles: AgingDetalle[];
}

@Injectable({ providedIn: 'root' })
export class AgingService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/aging`;

    cxc(anno: number) {
        return this.http.get<AgingReport>(`${this.base}/cxc`, {
            params: new HttpParams().set('anno', anno.toString())
        });
    }

    cxp(anno: number) {
        return this.http.get<AgingReport>(`${this.base}/cxp`, {
            params: new HttpParams().set('anno', anno.toString())
        });
    }
}
