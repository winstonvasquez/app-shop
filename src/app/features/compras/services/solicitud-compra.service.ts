import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { SolicitudCompra, SolicitudCompraPage } from '../models/solicitud-compra.model';

@Injectable({ providedIn: 'root' })
export class SolicitudCompraService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/solicitudes-compra`;

    private getCompanyHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    getSolicitudes(page = 0, size = 10, estado?: string): Observable<SolicitudCompraPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, {
            params,
            headers: this.getCompanyHeaders()
        }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as SolicitudCompra[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as SolicitudCompraPage;
            })
        );
    }

    getSolicitudById(id: string): Observable<SolicitudCompra> {
        return this.http.get<SolicitudCompra>(`${this.baseUrl}/${id}`, {
            headers: this.getCompanyHeaders()
        });
    }

    getMisSolicitudes(solicitanteId: string, page = 0, size = 10): Observable<SolicitudCompraPage> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Solicitante-Id': solicitanteId
        });
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<unknown>(`${this.baseUrl}/mis-solicitudes`, { params, headers }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as SolicitudCompra[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as SolicitudCompraPage;
            })
        );
    }

    createSolicitud(
        solicitud: Partial<SolicitudCompra>,
        solicitanteId: string,
        solicitanteNombre: string
    ): Observable<SolicitudCompra> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Solicitante-Id': solicitanteId,
            'X-Solicitante-Nombre': solicitanteNombre
        });
        return this.http.post<SolicitudCompra>(this.baseUrl, solicitud, { headers });
    }

    updateSolicitud(id: string, solicitud: Partial<SolicitudCompra>): Observable<SolicitudCompra> {
        return this.http.put<SolicitudCompra>(`${this.baseUrl}/${id}`, solicitud, {
            headers: this.getCompanyHeaders()
        });
    }

    enviarSolicitud(id: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/enviar`, {}, {
            headers: this.getCompanyHeaders()
        });
    }

    aprobarSolicitud(id: string, aprobadorId: string): Observable<SolicitudCompra> {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        const headers = new HttpHeaders({
            'X-Company-Id': companyId,
            'X-Aprobador-Id': aprobadorId
        });
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/aprobar`, {}, { headers });
    }

    rechazarSolicitud(id: string, motivo: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/rechazar`,
            { motivoRechazo: motivo },
            { headers: this.getCompanyHeaders() }
        );
    }

    cancelarSolicitud(id: string): Observable<SolicitudCompra> {
        return this.http.post<SolicitudCompra>(`${this.baseUrl}/${id}/cancelar`, {}, {
            headers: this.getCompanyHeaders()
        });
    }

    convertirAOrdenCompra(
        id: string,
        proveedorId: string,
        condicionPago: string,
        almacenDestino?: string
    ): Observable<unknown> {
        return this.http.post<unknown>(`${this.baseUrl}/${id}/convertir-oc`,
            { proveedorId, condicionPago, almacenDestino },
            { headers: this.getCompanyHeaders() }
        );
    }
}
