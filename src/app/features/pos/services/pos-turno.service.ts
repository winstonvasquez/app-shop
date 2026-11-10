import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { TurnoCaja, TurnoCajaApertura, TurnoCajaListado } from '../models/turno-caja.model';
import { Sucursal } from '../models/venta-pos.model';
import { Page, adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { ReporteXZ } from '../components/pos-report-viewer/pos-report-viewer.component';
import { CierreArqueoData } from '../components/pos-denomination-counter/pos-denomination-counter.component';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PosTurnoService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos + '/turno';

    abrirTurno(apertura: TurnoCajaApertura): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/abrir`, apertura);
    }

    /** Sucursales activas de la empresa, para elegir dónde se abre la caja. */
    listarSucursales(companyId: number): Observable<Sucursal[]> {
        return this.http.get<Sucursal[]>(`${environment.apiUrls.pos}/sucursales`, { params: toHttpParams({ companyId }) });
    }

    /**
     * Devuelve el turno activo, o null si el cajero no tiene ninguno (SÓLO el 404 significa «sin turno»).
     * Cualquier otro fallo (500, timeout, sin red) se propaga: tratarlo como «sin turno» llevaba al cajero
     * a «Abrir turno» y a un 409 por turno ya abierto.
     */
    getTurnoActivo(cajeroId: number): Observable<TurnoCaja | null> {
        const params = new HttpParams().set('cajeroId', cajeroId.toString());
        return this.http.get<TurnoCaja>(`${this.baseUrl}/activo`, { params }).pipe(
            catchError((err: unknown) =>
                err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err))
        );
    }

    getResumenTurno(turnoId: number): Observable<TurnoCaja> {
        return this.http.get<TurnoCaja>(`${this.baseUrl}/${turnoId}/resumen`);
    }

    cerrarTurnoConArqueo(turnoId: number, data: CierreArqueoData): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/${turnoId}/cerrar-arqueo`, data);
    }

    /** Listado de turnos de la empresa (sólo ADMIN/GERENTE; otro rol recibe 403). */
    listarTurnos(filtros: { estado?: string; page: number; size: number }): Observable<Page<TurnoCajaListado>> {
        const { page, size } = filtros;
        return this.http.get<unknown>(`${environment.apiUrls.pos}/turnos`, { params: toHttpParams({ ...filtros }) }).pipe(
            map(raw => adaptSpringPage<TurnoCajaListado>(raw, page, size)));
    }

    /** Cierre de un turno ajeno por un supervisor (`cerrar-arqueo` sobre turno de otro cajero da 403). */
    cierreForzoso(turnoId: number, data: CierreArqueoData): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/${turnoId}/cierre-forzoso`, data);
    }

    getReporteX(turnoId: number): Observable<ReporteXZ> {
        return this.http.get<ReporteXZ>(`${this.baseUrl}/${turnoId}/reporte-x`);
    }

    getReporteZ(turnoId: number): Observable<ReporteXZ> {
        return this.http.get<ReporteXZ>(`${this.baseUrl}/${turnoId}/reporte-z`);
    }
}
