import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ItemRecepcionRequest, Recepcion } from '../models/orden-compra.model';

export interface RecepcionPage {
    content: Recepcion[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateRecepcionRequest {
    ordenCompraId: string;
    numeroGuia?: string;
    transportista?: string;
    fechaRecepcion?: string;
    responsable?: string;
    almacenDestino?: string;
    observaciones?: string;
    items?: ItemRecepcionRequest[];
}

@Injectable({ providedIn: 'root' })
export class RecepcionService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/recepciones`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    getRecepciones(page = 0, size = 10, estado?: string): Observable<RecepcionPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as Recepcion[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as RecepcionPage;
            })
        );
    }

    getRecepcionById(id: string): Observable<Recepcion> {
        return this.http.get<Recepcion>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    getRecepcionesByOrden(ordenCompraId: string): Observable<Recepcion[]> {
        return this.http.get<Recepcion[]>(`${this.baseUrl}/por-orden/${ordenCompraId}`, {
            headers: this.getHeaders(),
        });
    }

    createRecepcion(request: CreateRecepcionRequest): Observable<Recepcion> {
        return this.http.post<Recepcion>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    confirmarRecepcion(id: string): Observable<Recepcion> {
        return this.http.post<Recepcion>(`${this.baseUrl}/${id}/confirmar`, {}, { headers: this.getHeaders() });
    }
}
