import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { toHttpParams } from '@core/utils/http-params.util';

export interface ZonaEnvio {
    id: number;
    nombre: string;
    departamento: string;
    provincia: string;
    distrito: string;
    costoEnvio: number;
    tiempoEstimadoDias: number;
}

@Injectable({ providedIn: 'root' })
export class ZonaEnvioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/envio/zonas`;

    getZonas(distrito?: string): Observable<ZonaEnvio[]> {
        let params = toHttpParams({
            distrito,
        });
        return this.http.get<ZonaEnvio[]>(this.baseUrl, { params });
    }
}
