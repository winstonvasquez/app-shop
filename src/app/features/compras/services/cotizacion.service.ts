import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import {
    ComparativaDto,
    CotizacionResumen,
    CotizacionesPage,
    CrearCotizacionRequest,
    RegistrarRespuestaRequest,
} from '../models/cotizacion.model';

@Injectable({ providedIn: 'root' })
export class CotizacionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/cotizaciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    listar(page = 0, size = 10, estado?: string): Observable<CotizacionesPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as CotizacionResumen[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                    first: !!(r['first'] as boolean),
                    last: !!(r['last'] as boolean),
                    empty: !!(r['empty'] as boolean),
                } as CotizacionesPage;
            })
        );
    }

    crear(request: CrearCotizacionRequest): Observable<CotizacionResumen> {
        return this.http.post<CotizacionResumen>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    enviar(id: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/enviar`, {}, { headers: this.getHeaders() });
    }

    registrarRespuesta(id: string, request: RegistrarRespuestaRequest): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/registrar-respuesta`, request, {
            headers: this.getHeaders(),
        });
    }

    getComparativa(id: string): Observable<ComparativaDto> {
        return this.http.get<ComparativaDto>(`${this.baseUrl}/${id}/comparativa`, {
            headers: this.getHeaders(),
        });
    }

    adjudicar(id: string, proveedorId: string): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/adjudicar`, { proveedorId }, {
            headers: this.getHeaders(),
        });
    }

    convertirOc(id: string): Observable<{ ordenCompraId: string }> {
        return this.http.post<{ ordenCompraId: string }>(`${this.baseUrl}/${id}/convertir-oc`, {}, {
            headers: this.getHeaders(),
        });
    }
}
