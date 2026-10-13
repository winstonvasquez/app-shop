import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Proveedor, ProveedorPage } from '../models/proveedor.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { adaptSpringPage } from '@core/models/pagination.model';

/**
 * Opción mínima de proveedor para poblar un `<select>` de filtro
 * (`signalFilter('proveedorId', ...)`). Fuente única: antes cada página
 * declaraba su propia copia de esta interfaz.
 */
export interface ProveedorFiltroOption {
    id: string;
    razonSocial: string;
}

/**
 * Proyecta la página de proveedores a opciones de filtro. Descarta los que no
 * tengan `id` (en el modelo es opcional) para no emitir un `<option>` sin valor.
 * Acepta cualquier forma con `id`/`razonSocial` — sirve tanto para `Proveedor[]`
 * como para respuestas tipadas inline en el propio componente.
 */
export function toProveedorOptions(
    content: readonly { id?: string; razonSocial: string }[] | undefined
): ProveedorFiltroOption[] {
    return (content ?? [])
        .filter((p): p is { id: string; razonSocial: string } => !!p.id)
        .map(p => ({ id: p.id, razonSocial: p.razonSocial }));
}

/** Filtros server-side del listado de proveedores. Todos opcionales. */
export interface ProveedorFiltros {
    page?: number;
    size?: number;
    search?: string;
    estado?: string;
    condicionSunat?: string;
    condicionPago?: string;
    monedaPreferida?: string;
    nivelProveedor?: string;
    /** 'true' | 'false' */
    agenteRetencion?: string;
    banco?: string;
    /** yyyy-MM-dd */
    createdAtDesde?: string;
    /** yyyy-MM-dd */
    createdAtHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.purchases}/api/proveedores`;

    /**
     * Filtros del listado de proveedores. TODO el filtrado ocurre en el backend
     * (`GET /purchases/api/proveedores`); la vista nunca filtra la página cargada.
     */
    getProveedores(filtros: ProveedorFiltros = {}): Observable<ProveedorPage> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            search: filtros.search,
            estado: filtros.estado,
            condicionSunat: filtros.condicionSunat,
            condicionPago: filtros.condicionPago,
            monedaPreferida: filtros.monedaPreferida,
            nivelProveedor: filtros.nivelProveedor,
            agenteRetencion: filtros.agenteRetencion,
            banco: filtros.banco,
            createdAtDesde: filtros.createdAtDesde,
            createdAtHasta: filtros.createdAtHasta,
        });

        return this.http.get<unknown>(this.baseUrl, { params }).pipe(
            map((raw: unknown) => adaptSpringPage<Proveedor>(raw, page, size) as ProveedorPage)
        );
    }

    /**
     * Variante pura (Promise) de `getProveedores`, pensada para adapters
     * `ServerSelectDataSource` (ver `proveedorSelectSource`). No muta ningún
     * signal de estado compartido — solo envuelve la misma llamada HTTP.
     */
    async searchPage(page = 0, size = 10, search?: string): Promise<ProveedorPage> {
        return firstValueFrom(this.getProveedores({ page, size, search }));
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
