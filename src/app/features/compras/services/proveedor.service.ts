import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Proveedor, ProveedorPage } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.purchases}/api/proveedores`;

    getProveedores(page = 0, size = 10, search?: string, estado?: string): Observable<ProveedorPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (search) params = params.set('search', search);
        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as Proveedor[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as ProveedorPage;
            })
        );
    }

    getProveedorById(id: string): Observable<Proveedor> {
        return this.http.get<Proveedor>(`${this.baseUrl}/${id}`);
    }

    getProveedorByRuc(ruc: string): Observable<Proveedor> {
        return this.http.get<Proveedor>(`${this.baseUrl}/ruc/${ruc}`);
    }

    createProveedor(proveedor: Partial<Proveedor>): Observable<Proveedor> {
        return this.http.post<Proveedor>(this.baseUrl, proveedor);
    }

    updateProveedor(id: string, proveedor: Partial<Proveedor>): Observable<Proveedor> {
        return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, proveedor);
    }

    deleteProveedor(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
