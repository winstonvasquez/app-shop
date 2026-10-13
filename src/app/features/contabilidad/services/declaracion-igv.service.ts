import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Page, adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Espejo de `PDT621Dto` (backend). `declaracionId` es null mientras no se guarda. */
export interface PDT621 {
    declaracionId: string | null;
    periodoId: string;
    ventasGravadas: number;
    igvVentas: number;
    comprasGravadas: number;
    igvCompras: number;
    igvNeto: number;
    regimenRenta: string;
    coeficienteRenta: number;
    ingresosNetos: number;
    rentaMensual: number;
    totalAPagar: number;
    /** ISO yyyy-MM-dd. */
    fechaVencimiento: string | null;
    estado: string;
    /** Saldo a favor de IGV arrastrado del periodo anterior (ya descontado en totalAPagar). */
    saldoFavorAnterior: number;
    /** Saldo a favor que se arrastra al periodo siguiente. */
    saldoFavorSiguiente: number;
}

export interface DeclaracionRequest {
    periodoId: string;
    regimenRenta: 'RMT' | 'MYPE' | 'GENERAL';
    coeficienteRenta: number;
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
    /** El backend devuelve `Page<PDT621Dto>`; se normaliza y el llamador recibe la página. */
    historial(page = 0, size = 50): Observable<Page<PDT621>> {
        return this.http
            .get<unknown>(`${this.base}/historial`, { params: toHttpParams({ page, size }) })
            .pipe(map(raw => adaptSpringPage<PDT621>(raw, page, size)));
    }
    porPeriodo(periodoId: string) {
        return this.http.get<PDT621>(`${this.base}/periodo/${periodoId}`);
    }
}
