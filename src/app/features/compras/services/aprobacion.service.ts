import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { AprobacionPendiente, ConfigAprobacionRequest, NivelAprobacion } from '../models/aprobacion.model';

@Injectable({ providedIn: 'root' })
export class AprobacionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    getPendientes(rol: string): Observable<AprobacionPendiente[]> {
        const params = new HttpParams().set('rol', rol);
        return this.http.get<AprobacionPendiente[]>(`${this.baseUrl}/aprobaciones/pendientes`, {
            headers: this.getHeaders(),
            params,
        });
    }

    getByOrden(ordenId: string): Observable<AprobacionPendiente[]> {
        return this.http.get<AprobacionPendiente[]>(`${this.baseUrl}/aprobaciones/orden/${ordenId}`, {
            headers: this.getHeaders(),
        });
    }

    iniciarFlujo(ordenId: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/aprobaciones/${ordenId}/iniciar`, {}, {
            headers: this.getHeaders(),
        });
    }

    aprobar(aprobacionId: string, comentario: string, aprobadorId: string, aprobadorNombre: string): Observable<void> {
        const headers = this.getHeaders()
            .set('X-Aprobador-Id', aprobadorId)
            .set('X-Aprobador-Nombre', aprobadorNombre);
        return this.http.post<void>(`${this.baseUrl}/aprobaciones/${aprobacionId}/aprobar`,
            { comentario }, { headers });
    }

    rechazar(aprobacionId: string, motivo: string, aprobadorId: string, aprobadorNombre: string): Observable<void> {
        const headers = this.getHeaders()
            .set('X-Aprobador-Id', aprobadorId)
            .set('X-Aprobador-Nombre', aprobadorNombre);
        return this.http.post<void>(`${this.baseUrl}/aprobaciones/${aprobacionId}/rechazar`,
            { motivo }, { headers });
    }

    getNiveles(): Observable<NivelAprobacion[]> {
        return this.http.get<NivelAprobacion[]>(`${this.baseUrl}/config/niveles-aprobacion`, {
            headers: this.getHeaders(),
        });
    }

    crearNivel(request: ConfigAprobacionRequest): Observable<NivelAprobacion> {
        return this.http.post<NivelAprobacion>(`${this.baseUrl}/config/niveles-aprobacion`,
            request, { headers: this.getHeaders() });
    }

    eliminarNivel(nivelId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/config/niveles-aprobacion/${nivelId}`, {
            headers: this.getHeaders(),
        });
    }
}
