import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TurnoCaja, TurnoCajaApertura } from '../models/turno-caja.model';
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
     * Devuelve el turno activo o null si no existe (404 no lanza error).
     * Esto permite que la app arranque sin turno sin mostrar toast de error.
     */
    getTurnoActivo(cajeroId: number): Observable<TurnoCaja | null> {
        const params = new HttpParams().set('cajeroId', cajeroId.toString());
        return this.http.get<TurnoCaja>(`${this.baseUrl}/activo`, { params }).pipe(
            catchError(() => of(null))
        );
    }

    getResumenTurno(turnoId: number): Observable<TurnoCaja> {
        return this.http.get<TurnoCaja>(`${this.baseUrl}/${turnoId}/resumen`);
    }
}
