import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { CrearDevolucionRequest, Devolucion } from '../models/devolucion.model';
import { Page } from '@core/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/devoluciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    listar(page = 0, size = 10, estado?: string): Observable<Page<Devolucion>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as Devolucion[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                    first: !!(r['first'] as boolean),
                    last: !!(r['last'] as boolean),
                    empty: !!(r['empty'] as boolean),
                } as Page<Devolucion>;
            })
        );
    }

    getById(id: string): Observable<Devolucion> {
        return this.http.get<Devolucion>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    crear(request: CrearDevolucionRequest): Observable<Devolucion> {
        return this.http.post<Devolucion>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    enviar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/enviar`, {}, { headers: this.getHeaders() });
    }

    aceptar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/aceptar`, {}, { headers: this.getHeaders() });
    }

    completar(id: string): Observable<Devolucion> {
        return this.http.post<Devolucion>(`${this.baseUrl}/${id}/completar`, {}, { headers: this.getHeaders() });
    }
}
