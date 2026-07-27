import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { PageResponse } from '@core/models/pagination.model';

export interface Promocion {
    id?: number;
    nombre: string;
    descripcion?: string;
    tipo: 'PORCENTAJE' | 'MONTO_FIJO';
    valor: number;
    alcance: 'PRODUCTO' | 'CATEGORIA' | 'CARRITO';
    codigoCupon?: string;
    limiteUsos?: number;
    usosActuales: number;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
}

/** Filtros opcionales para GET /sales/api/v1/promociones (todos server-side). */
export interface PromocionFiltros {
    page?: number;
    size?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    search?: string;
    tipo?: string;
    alcance?: string;
    subtipo?: string;
    activo?: boolean;
    /** Derivado en el backend: ACTIVA | INACTIVA | VENCIDA (ver PromocionQueryService). */
    estado?: string;
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class PromotionsService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/promociones`;

    /**
     * Listado paginado con búsqueda y filtros avanzados — reemplaza el antiguo
     * getAll() sin paginar (el backend ya devuelve Page<PromocionResponseDto>).
     */
    getAll(filtros: PromocionFiltros = {}): Observable<PageResponse<Promocion>> {
        let params = new HttpParams()
            .set('page', String(filtros.page ?? 0))
            .set('size', String(filtros.size ?? 20));

        if (filtros.sortField) {
            params = params.set('sort', `${filtros.sortField},${filtros.sortDirection ?? 'desc'}`);
        }
        if (filtros.search) params = params.set('search', filtros.search);
        if (filtros.tipo) params = params.set('tipo', filtros.tipo);
        if (filtros.alcance) params = params.set('alcance', filtros.alcance);
        if (filtros.subtipo) params = params.set('subtipo', filtros.subtipo);
        if (filtros.activo !== undefined) params = params.set('activo', String(filtros.activo));
        if (filtros.estado) params = params.set('estado', filtros.estado);
        if (filtros.fechaInicioDesde) params = params.set('fechaInicioDesde', filtros.fechaInicioDesde);
        if (filtros.fechaInicioHasta) params = params.set('fechaInicioHasta', filtros.fechaInicioHasta);
        if (filtros.fechaFinDesde) params = params.set('fechaFinDesde', filtros.fechaFinDesde);
        if (filtros.fechaFinHasta) params = params.set('fechaFinHasta', filtros.fechaFinHasta);

        return this.http.get<PageResponse<Promocion>>(this.baseUrl, { params }).pipe(
            catchError(() => of({
                content: [], totalElements: 0, totalPages: 0, size: filtros.size ?? 20,
                number: filtros.page ?? 0, first: true, last: true, empty: true
            } as PageResponse<Promocion>))
        );
    }

    create(dto: Omit<Promocion, 'id' | 'usosActuales'>): Observable<Promocion> {
        return this.http.post<Promocion>(this.baseUrl, { ...dto, usosActuales: 0 }).pipe(
            catchError(this.handleError)
        );
    }

    update(id: number, dto: Partial<Promocion>): Observable<Promocion> {
        return this.http.put<Promocion>(`${this.baseUrl}/${id}`, dto, { params: this.tenantParams() }).pipe(
            catchError(this.handleError)
        );
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`, { params: this.tenantParams() }).pipe(
            catchError(this.handleError)
        );
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            const backendDetail = error.error?.detail || error.error?.message;
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === HTTP_STATUS.badRequest) {
                errorMessage = backendDetail || 'Datos de la promoción inválidos';
            } else if (error.status === HTTP_STATUS.notFound) {
                errorMessage = 'Promoción no encontrada';
            } else if (error.status === HTTP_STATUS.conflict) {
                errorMessage = backendDetail || 'La promoción ya existe o el código de cupón está en uso';
            } else if (error.status === HTTP_STATUS.internalServerError) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = backendDetail || `Error ${error.status}: ${error.statusText}`;
            }
        }

        console.error('PromotionsService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
