import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { toHttpParams } from '@core/utils/http-params.util';

export interface AuditLog {
    id: string;
    entidadTipo: string;
    entidadId: string;
    accion: string;
    usuarioId: string;
    usuarioNombre: string;
    datosAnteriores: string | null;
    datosNuevos: string | null;
    ipOrigen: string | null;
    timestamp: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

/** Opción de usuario para el select de filtro (id ya envuelto como UUID sintético). */
export interface UsuarioFiltroOption {
    id: string;
    nombre: string;
}

/** Filtros server-side del listado de auditoría contable. Todos opcionales. */
export interface AuditLogFiltros {
    entidadTipo?: string;
    accion?: string;
    /** UUID sintético (ver `longToSyntheticUuid`). */
    usuarioId?: string;
    /** ISO Instant. */
    desde?: string;
    /** ISO Instant. */
    hasta?: string;
    search?: string;
    page?: number;
    size?: number;
}

/**
 * Convierte el `id` Long de un usuario (microshopusers) al UUID sintético
 * `new UUID(0, id)` que usa microshopcontabilidad para `AuditLogContableEntity.usuarioId`
 * (ver JwtAuthenticationFilter.parseUuidOrLong / TenantAccessAspect.toUuid).
 *
 * Se re-exporta desde `@core/utils/synthetic-uuid.util`, donde vive la única
 * implementación: esta misma conversión llegó a estar copiada en tres sitios.
 */
export { longToSyntheticUuid } from '@core/utils/synthetic-uuid.util';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/audit-log`;
    private usersBase = `${environment.apiUrls.users}/api/users`;

    buscar(params: AuditLogFiltros = {}) {
        let p = toHttpParams({
            entidadTipo: params.entidadTipo,
            accion: params.accion,
            usuarioId: params.usuarioId,
            desde: params.desde,
            hasta: params.hasta,
            search: params.search,
            page: params.page,
            size: params.size,
        });
        return this.http.get<PageResponse<AuditLog>>(this.base, { params: p });
    }

    porEntidad(entidadTipo: string, entidadId: string) {
        return this.http.get<AuditLog[]>(`${this.base}/${entidadTipo}/${entidadId}`);
    }

    /** Usuarios de la empresa, para el select de filtro `usuarioId` del toolbar. */
    listarUsuariosFiltro() {
        return this.http.get<{ id: number; username: string; persona?: { nombreCompleto?: string } }[]>(
            `${this.usersBase}/all`
        );
    }
}
