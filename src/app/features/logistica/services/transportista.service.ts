import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Transportista, TransportistaPage, CreateTransportistaDto, TransportistaFiltros } from '../models/transportista.model';
import { PAGINATION } from '@shared/constants/app.constants';

@Injectable({ providedIn: 'root' })
export class TransportistaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/carriers';

    /**
     * Fix ronda 3 (2026-07-26): `CarrierController.getAllCarriers()` devuelve un ARRAY PLANO
     * (`List<CarrierResponse>`), ignorando page/size — no un `Page`. Los consumidores hacían
     * `res.content` sobre un array → `undefined`: la tabla de Transportistas y el selector de
     * transportista de la página de Envíos quedaban VACÍOS (mismatch detectado en ronda 2 y
     * dejado abierto). Se normaliza acá, una sola vez, con paginado del lado del cliente,
     * para que todos los consumidores reciban siempre el shape `TransportistaPage`.
     */
    getTransportistas(companyId: string, page = 0, size: number = PAGINATION.defaultPageSize): Observable<TransportistaPage> {
        const params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<Transportista[] | TransportistaPage>(this.baseUrl, { params }).pipe(
            map(res => this.normalizarPagina(res, page, size))
        );
    }

    /** Convierte el array plano del backend en `TransportistaPage`; si ya viene paginado, lo deja pasar. */
    private normalizarPagina(
        res: Transportista[] | TransportistaPage,
        page: number,
        size: number
    ): TransportistaPage {
        if (!Array.isArray(res)) {
            return { ...res, content: res?.content ?? [] };
        }
        const desde = page * size;
        return {
            content: res.slice(desde, desde + size),
            totalElements: res.length,
            totalPages: Math.ceil(res.length / size),
            size,
            number: page
        };
    }

    /**
     * Listado paginado y filtrado SERVER-SIDE real (`GET /carriers/paged`, ronda de filtros
     * avanzados 2026-07-27). El companyId/tenantId se resuelve del JWT (TenantContext) — no se
     * envía. Reemplaza el hack `normalizarPagina` para el listado principal de Transportistas;
     * `getTransportistas` se mantiene intacto porque otras páginas (Envíos, SLA de transportistas)
     * lo siguen usando para poblar selects.
     */
    getCarriersPaged(filtros: TransportistaFiltros = {}): Observable<TransportistaPage> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? PAGINATION.defaultPageSize));
        if (filtros.serviceType) params = params.set('serviceType', filtros.serviceType);
        if (filtros.active !== undefined && filtros.active !== null) params = params.set('active', String(filtros.active));
        if (filtros.apiEnabled !== undefined && filtros.apiEnabled !== null) params = params.set('apiEnabled', String(filtros.apiEnabled));
        if (filtros.fechaCreacionDesde) params = params.set('fechaCreacionDesde', filtros.fechaCreacionDesde);
        if (filtros.fechaCreacionHasta) params = params.set('fechaCreacionHasta', filtros.fechaCreacionHasta);
        if (filtros.q) params = params.set('q', filtros.q);
        return this.http.get<TransportistaPage>(`${this.baseUrl}/paged`, { params });
    }

    getById(id: string, companyId: string): Observable<Transportista> {
        return this.http.get<Transportista>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    create(dto: CreateTransportistaDto): Observable<Transportista> {
        return this.http.post<Transportista>(this.baseUrl, dto);
    }

    update(id: string, dto: Partial<CreateTransportistaDto>): Observable<Transportista> {
        return this.http.put<Transportista>(`${this.baseUrl}/${id}`, dto);
    }

    /**
     * Fix ronda 3 (2026-07-26): no existe `PATCH /carriers/{id}/status` en `CarrierController`
     * (el PATCH devolvía 405 → los botones Activar/Desactivar de la página de Transportistas
     * nunca funcionaron). El backend expone `PUT /{id}/activate` y `PUT /{id}/deactivate`,
     * ambos 204 No Content; el tenant sale del JWT, no hace falta companyId.
     */
    toggleActivo(id: string, active: boolean): Observable<void> {
        const accion = active ? 'activate' : 'deactivate';
        return this.http.put<void>(`${this.baseUrl}/${id}/${accion}`, {});
    }
}
