import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { adaptSpringPage, Page } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface CuponResponse {
    id: number;
    codigo: string | null;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    valor: number;
    fechaFin: string;
    status: 'ACTIVE' | 'USED' | 'EXPIRED';
    usedAt: string | null;
}

/**
 * Filtros server-side de "mis cupones". `status` (ACTIVE/USED/EXPIRED) es un valor
 * DERIVADO (no hay columna "estado") pero el backend SÍ lo resuelve en la query
 * (`ClienteCuponRepository.findMineWithFilters`) comparando usedAt/fechaFin — por eso
 * viaja como filtro normal, igual que search/tipo/rangos de fecha.
 */
export interface MisCuponesFiltros {
    /** Busca por código de cupón o nombre de la promoción. */
    search?: string;
    tipo?: string;
    status?: 'ACTIVE' | 'USED' | 'EXPIRED';
    /** yyyy-MM-dd — vigencia (fechaFin) de la promoción. */
    fechaFinDesde?: string;
    fechaFinHasta?: string;
    /** yyyy-MM-dd — fecha en que se asignó el cupón al cliente. */
    assignedAtDesde?: string;
    assignedAtHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
    private http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.sales}/api/cupones`;

    /**
     * Cupones del cliente autenticado (`GET /api/cupones/mine`). TODO el filtrado —
     * incluido `status`— ocurre en el backend; la vista nunca filtra la página cargada.
     */
    getMyCupones(page = 0, size = 20, filtros: MisCuponesFiltros = {}): Observable<Page<CuponResponse>> {
        let params = toHttpParams({
            page,
            size,
            search: filtros.search,
            tipo: filtros.tipo,
            status: filtros.status,
            fechaFinDesde: filtros.fechaFinDesde,
            fechaFinHasta: filtros.fechaFinHasta,
            assignedAtDesde: filtros.assignedAtDesde,
            assignedAtHasta: filtros.assignedAtHasta,
        });

        // Boot 3 puede anidar los metadatos bajo `page`: sin adaptar, totalPages quedaba undefined.
        return this.http.get<unknown>(`${this.base}/mine`, { params }).pipe(
            map(raw => adaptSpringPage<CuponResponse>(raw, page, size)),
        );
    }
}
