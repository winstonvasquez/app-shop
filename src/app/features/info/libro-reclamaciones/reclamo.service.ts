import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { Page, adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { EstadoReclamo, Reclamo, ReclamoRequest, TipoReclamo } from './reclamo.model';

/** Libro de Reclamaciones: alta pública (sin JWT; la tienda la resuelve X-Tenant-Domain) y gestión del personal. */
@Injectable({ providedIn: 'root' })
export class ReclamoService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.sales}/api/reclamos`;

    crear(req: ReclamoRequest): Observable<Reclamo> {
        return this.http.post<Reclamo>(this.base, req);
    }

    listar(filtros: { estado?: EstadoReclamo | ''; tipo?: TipoReclamo | '' }, page: number, size: number): Observable<Page<Reclamo>> {
        const params = toHttpParams({ ...filtros, page, size, sort: 'fechaRegistro,desc' });
        return this.http.get<unknown>(this.base, { params }).pipe(map(r => adaptSpringPage<Reclamo>(r, page, size)));
    }

    obtener(id: number): Observable<Reclamo> {
        return this.http.get<Reclamo>(`${this.base}/${id}`);
    }

    responder(id: number, respuesta: string): Observable<Reclamo> {
        return this.http.put<Reclamo>(`${this.base}/${id}/respuesta`, { respuesta });
    }
}
