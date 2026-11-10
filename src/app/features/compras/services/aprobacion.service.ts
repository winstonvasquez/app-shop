import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { AprobacionPendiente, ConfigAprobacionRequest, NivelAprobacion, ParametroEmpresa } from '../models/aprobacion.model';
import { toHttpParams } from '@core/utils/http-params.util';

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

    /** El aprobador sale del JWT en el backend (COMPRAS-11): ya no viajan X-Aprobador-Id/Nombre. */
    aprobar(aprobacionId: string, comentario: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/aprobaciones/${aprobacionId}/aprobar`,
            { comentario }, { headers: this.getHeaders() });
    }

    rechazar(aprobacionId: string, motivo: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/aprobaciones/${aprobacionId}/rechazar`,
            { motivo }, { headers: this.getHeaders() });
    }

    getParametros(): Observable<ParametroEmpresa[]> {
        return this.http.get<ParametroEmpresa[]>(`${this.baseUrl}/parametros-empresa`, { headers: this.getHeaders() });
    }

    fijarParametro(clave: string, valor: boolean): Observable<ParametroEmpresa> {
        return this.http.put<ParametroEmpresa>(`${this.baseUrl}/parametros-empresa/${clave}`,
            { valor }, { headers: this.getHeaders() });
    }

    /** `activo` undefined = sin filtrar (activos + inactivos, necesario para reactivar). */
    getNiveles(activo?: boolean): Observable<NivelAprobacion[]> {
        let params = toHttpParams({
            activo,
        });
        return this.http.get<NivelAprobacion[]>(`${this.baseUrl}/config/niveles-aprobacion`, {
            headers: this.getHeaders(),
            params,
        });
    }

    crearNivel(request: ConfigAprobacionRequest): Observable<NivelAprobacion> {
        return this.http.post<NivelAprobacion>(`${this.baseUrl}/config/niveles-aprobacion`,
            request, { headers: this.getHeaders() });
    }

    actualizarNivel(nivelId: string, request: ConfigAprobacionRequest): Observable<NivelAprobacion> {
        return this.http.put<NivelAprobacion>(`${this.baseUrl}/config/niveles-aprobacion/${nivelId}`,
            request, { headers: this.getHeaders() });
    }

    eliminarNivel(nivelId: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/config/niveles-aprobacion/${nivelId}`, {
            headers: this.getHeaders(),
        });
    }
}
