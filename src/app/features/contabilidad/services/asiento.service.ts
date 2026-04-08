import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Asiento, AsientoRequest } from '../models/asiento.model';

@Injectable({ providedIn: 'root' })
export class AsientoService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad`;

    crearAsiento(asiento: AsientoRequest) {
        return this.http.post<Asiento>(`${this.baseUrl}/asientos`, asiento);
    }

    obtenerAsientos(periodoId: string, fechaDesde?: string, fechaHasta?: string) {
        let params = new HttpParams().set('periodo', periodoId);
        if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
        if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
        return this.http.get<Asiento[]>(`${this.baseUrl}/asientos`, { params });
    }

    obtenerAsiento(id: string) {
        return this.http.get<Asiento>(`${this.baseUrl}/asientos/${id}`);
    }

    cerrarAsiento(id: string) {
        return this.http.put<void>(`${this.baseUrl}/asientos/${id}/cerrar`, {});
    }

    extornarAsiento(id: string, motivo: string) {
        return this.http.post<Asiento>(`${this.baseUrl}/asientos/${id}/extorno`, { motivo });
    }

    anularAsiento(id: string, motivo: string) {
        return this.http.put<Asiento>(`${this.baseUrl}/asientos/${id}/anular`, { motivo });
    }

    obtenerLibroDiario(periodoId: string, fechaDesde: string, fechaHasta: string) {
        const params = new HttpParams()
            .set('periodo', periodoId)
            .set('fechaDesde', fechaDesde)
            .set('fechaHasta', fechaHasta);
        return this.http.get<any>(`${this.baseUrl}/libro-diario`, { params });
    }

    obtenerLibroMayor(periodoId: string, cuentaId?: string) {
        let params = new HttpParams().set('periodo', periodoId);
        if (cuentaId) params = params.set('cuenta', cuentaId);
        return this.http.get<any>(`${this.baseUrl}/libro-mayor`, { params });
    }

    obtenerBalanceComprobacion(periodoId: string) {
        return this.http.get<any>(`${this.baseUrl}/balance-comprobacion`, {
            params: new HttpParams().set('periodo', periodoId)
        });
    }
}
