import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';
import { mensajeDeErrorHttp, detalleDelBackend } from '@core/utils/http-error.util';

/** Resultado de `POST /promociones/{id}/asignar`. */
export interface AsignacionResultado {
    asignados: number;
    yaAsignados: number;
    /** Clientes del filtro sin usuario en la tienda: no pueden ver cupones. */
    sinCuenta: number;
}

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
    // Vinculación según alcance (V69, mutuamente excluyentes): PRODUCTO->productoId,
    // CATEGORIA->categoriaId, CARRITO->montoMinimo. Los *Nombre son solo de lectura (backend).
    productoId?: number | null;
    productoNombre?: string;
    categoriaId?: number | null;
    categoriaNombre?: string;
    montoMinimo?: number | null;
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
        const params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            sort: filtros.sortField ? `${filtros.sortField},${filtros.sortDirection ?? 'desc'}` : undefined,
            search: filtros.search,
            tipo: filtros.tipo,
            alcance: filtros.alcance,
            activo: filtros.activo,
            estado: filtros.estado,
            fechaInicioDesde: filtros.fechaInicioDesde,
            fechaInicioHasta: filtros.fechaInicioHasta,
            fechaFinDesde: filtros.fechaFinDesde,
            fechaFinHasta: filtros.fechaFinHasta,
        });

        // El error se propaga: tragarlo con una página vacía hacía pasar un 403/500 por «sin promociones».
        return this.http.get<PageResponse<Promocion>>(this.baseUrl, { params }).pipe(
            catchError(this.handleError)
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

    /** Emite la promoción (cupón) a los clientes con cuenta: todos, o los de un segmento. */
    asignar(id: number, body: { segmentoId?: number | null; clienteIds?: number[] }): Observable<AsignacionResultado> {
        return this.http.post<AsignacionResultado>(`${this.baseUrl}/${id}/asignar`, body).pipe(
            catchError(this.handleError)
        );
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('PromotionsService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error, {
            [HTTP_STATUS.notFound]: 'Promoción no encontrada',
            // Igual que en empresas: el detalle del backend nombra el cupón en conflicto.
            [HTTP_STATUS.conflict]: detalleDelBackend(error) ?? 'La promoción ya existe o el código de cupón esta en uso',
        })));
    }
}
