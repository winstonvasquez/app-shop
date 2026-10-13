import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { toHttpParams } from '@core/utils/http-params.util';

export interface CuponResponse {
    id: number;
    codigo: string | null;
    nombre: string;
    /** Alias visual usado en templates */
    titulo?: string;
    descripcion: string | null;
    tipo: string;
    valor: number;
    fechaFin: string;
    /** Alias de fechaFin usado en templates */
    fechaExpiracion?: string;
    status: 'ACTIVE' | 'USED' | 'EXPIRED';
    usedAt: string | null;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
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
    getMyCupones(page = 0, size = 20, filtros: MisCuponesFiltros = {}): Observable<PageResponse<CuponResponse>> {
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

        return this.http.get<PageResponse<CuponResponse>>(`${this.base}/mine`, { params });
    }
}
