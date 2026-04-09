import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { FacturaProveedor, RegistrarFacturaRequest } from '../models/factura-proveedor.model';
import { Page } from '@core/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class FacturaProveedorService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/facturas-proveedor`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    listar(page = 0, size = 10, estado?: string): Observable<Page<FacturaProveedor>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as FacturaProveedor[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                    first: !!(r['first'] as boolean),
                    last: !!(r['last'] as boolean),
                    empty: !!(r['empty'] as boolean),
                } as Page<FacturaProveedor>;
            })
        );
    }

    getById(id: string): Observable<FacturaProveedor> {
        return this.http.get<FacturaProveedor>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    getByOrden(ordenCompraId: string): Observable<FacturaProveedor[]> {
        return this.http.get<FacturaProveedor[]>(`${this.baseUrl}/por-orden/${ordenCompraId}`, {
            headers: this.getHeaders(),
        });
    }

    registrar(request: RegistrarFacturaRequest): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    aprobar(id: string): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(`${this.baseUrl}/${id}/aprobar`, {}, {
            headers: this.getHeaders(),
        });
    }

    rechazar(id: string, motivo: string): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(`${this.baseUrl}/${id}/rechazar`, { motivo }, {
            headers: this.getHeaders(),
        });
    }

    validarSunat(id: string): Observable<FacturaProveedor> {
        const sunatUrl = `${environment.apiUrls.purchases}/api/sunat/facturas/${id}/validar`;
        return this.http.post<FacturaProveedor>(sunatUrl, {}, { headers: this.getHeaders() });
    }
}
