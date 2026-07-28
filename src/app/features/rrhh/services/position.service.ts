import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { Position, PositionRequest } from '../models/position.model';

/** Filtros server-side del listado paginado de puestos. Todos opcionales. */
export interface PositionFiltros {
    page?: number;
    size?: number;
    search?: string;
    departmentId?: string;
    activo?: string;
    /** Texto libre (sin catálogo seedeado: la entidad no tiene un enum fijo de niveles). */
    nivel?: string;
}

@Injectable({ providedIn: 'root' })
export class PositionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/positions`;

    private readonly _positions = signal<Position[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);

    readonly positions = this._positions.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly activePositions = computed(() =>
        this._positions().filter(p => p.activo)
    );

    readonly totalPositions = computed(() => this._positions().length);

    /** Carga server-side paginada con filtros avanzados (search, departamento, estado y nivel). Todos opcionales. */
    async loadPositionsPaged(filtros: PositionFiltros = {}):
        Promise<{ totalElements: number; totalPages: number }> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const params: Record<string, string> = {
                page: String(filtros.page ?? 0),
                size: String(filtros.size ?? 20),
            };
            if (filtros.search) params['search'] = filtros.search;
            if (filtros.departmentId) params['departmentId'] = filtros.departmentId;
            if (filtros.activo) params['activo'] = filtros.activo;
            if (filtros.nivel) params['nivel'] = filtros.nivel;
            const res = await firstValueFrom(
                this.http.get<PageResponse<Position>>(`${this.baseUrl}/paged`, { params })
            );
            this._positions.set(res.content ?? []);
            return { totalElements: pageTotalElements(res), totalPages: pageTotalPages(res) };
        } catch (error) {
            this._error.set('Error al cargar puestos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    /**
     * Página server-side SIN mutar el estado compartido (`_positions`).
     * Pensado para el search-select: cada consulta es independiente del listado.
     * Nota: el backend ordena siempre por `nombre` asc (no soporta `sort`); el
     * parámetro se mantiene solo por paridad de firma con Employee/Department.
     */
    async searchPage(page: number, size: number, search?: string, sort?: string, departmentId?: number):
        Promise<PageResponse<Position>> {
        const params: Record<string, string> = { page: String(page), size: String(size) };
        if (search) params['search'] = search;
        if (sort) params['sort'] = sort;
        if (departmentId != null) params['departmentId'] = String(departmentId);
        return firstValueFrom(
            this.http.get<PageResponse<Position>>(`${this.baseUrl}/paged`, { params })
        );
    }

    async getPositionById(id: number): Promise<Position> {
        return firstValueFrom(
            this.http.get<Position>(`${this.baseUrl}/${id}`)
        );
    }

    async loadPositions(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const positions = await firstValueFrom(
                this.http.get<Position[]>(this.baseUrl)
            );
            this._positions.set(positions);
        } catch (error) {
            this._error.set('Error al cargar puestos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async loadAllPositions(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        try {
            const positions = await firstValueFrom(
                this.http.get<Position[]>(`${this.baseUrl}/all`)
            );
            this._positions.set(positions);
        } catch (error) {
            this._error.set('Error al cargar puestos');
            throw error;
        } finally {
            this._loading.set(false);
        }
    }

    async getPositionsByDepartment(departmentId: number): Promise<Position[]> {
        return firstValueFrom(
            this.http.get<Position[]>(`${this.baseUrl}/department/${departmentId}`)
        );
    }

    async createPosition(request: PositionRequest): Promise<Position> {
        this._loading.set(true);
        try {
            const position = await firstValueFrom(
                this.http.post<Position>(this.baseUrl, request)
            );
            this._positions.update(list => [...list, position]);
            return position;
        } finally {
            this._loading.set(false);
        }
    }

    async updatePosition(id: number, request: PositionRequest): Promise<Position> {
        this._loading.set(true);
        try {
            const position = await firstValueFrom(
                this.http.put<Position>(`${this.baseUrl}/${id}`, request)
            );
            this._positions.update(list =>
                list.map(p => p.id === id ? position : p)
            );
            return position;
        } finally {
            this._loading.set(false);
        }
    }

    async deactivatePosition(id: number): Promise<void> {
        await firstValueFrom(
            this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {})
        );
        this._positions.update(list =>
            list.map(p => p.id === id ? { ...p, activo: false } : p)
        );
    }

    async activatePosition(id: number): Promise<void> {
        await firstValueFrom(
            this.http.patch<void>(`${this.baseUrl}/${id}/activate`, {})
        );
        this._positions.update(list =>
            list.map(p => p.id === id ? { ...p, activo: true } : p)
        );
    }
}
