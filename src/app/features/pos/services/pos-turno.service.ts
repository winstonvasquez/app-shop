import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { TurnoCaja, TurnoCajaApertura } from '../models/turno-caja.model';
import { ReporteXZ } from '../components/pos-report-viewer/pos-report-viewer.component';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PosTurnoService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos + '/turno';

    abrirTurno(apertura: TurnoCajaApertura): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/abrir`, apertura);
    }

    cerrarTurno(turnoId: number): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/${turnoId}/cerrar`, {});
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

    cerrarTurnoConArqueo(turnoId: number, data: unknown): Observable<TurnoCaja> {
        return this.http.post<TurnoCaja>(`${this.baseUrl}/${turnoId}/cerrar-arqueo`, data);
    }

    getReporteX(turnoId: number): Observable<ReporteXZ> {
        return this.http.get<ReporteXZ>(`${this.baseUrl}/${turnoId}/reporte-x`);
    }

    getReporteZ(turnoId: number): Observable<ReporteXZ> {
        return this.http.get<ReporteXZ>(`${this.baseUrl}/${turnoId}/reporte-z`);
    }
}
