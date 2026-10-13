import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

export interface CuentaContable {
    id: string;
    codigo: string;
    nombre: string;
    tipo: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'RESULTADO' | 'ANALITICA';
    nivel: number;
    cuentaPadreId?: string | null;
    esAnalitica?: boolean;
    aceptaMovimiento: boolean;
    estado: string;
}

/** Alta manual de una cuenta PCGE. El nivel se deriva del código en el backend. */
export interface CuentaContableRequest {
    codigo: string;
    nombre: string;
    tipo: string;
    cuentaPadreId?: string | null;
    esAnalitica: boolean;
    aceptaMovimiento: boolean;
    estado: string;
}

/**
 * Edición de una cuenta PCGE. Sin `codigo` (clave de negocio bloqueada en edición) ni
 * `nivel` (derivado del código). Semántica null = no tocar en cada campo.
 */
export interface CuentaContableUpdateRequest {
    nombre?: string;
    tipo?: string;
    cuentaPadreId?: string | null;
    esAnalitica?: boolean;
    aceptaMovimiento?: boolean;
    estado?: string;
}

@Injectable({ providedIn: 'root' })
export class CuentaService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/cuentas`;

    listarTodas() {
        return this.http.get<CuentaContable[]>(`${this.baseUrl}/todas`);
    }

    /** Listado paginado con filtros server-side (backend: GET /cuentas, ronda 2026-07-27). */
    listarPaginado(options?: {
        page?: number; size?: number; nivel?: number;
        busqueda?: string; tipo?: string; estado?: string;
        aceptaMovimiento?: boolean; esAnalitica?: boolean;
    }): Observable<PageResponse<CuentaContable>> {
        let params = toHttpParams(options);
        return this.http.get<PageResponse<CuentaContable>>(this.baseUrl, { params });
    }

    buscarPorCodigo(codigo: string) {
        return this.http.get<CuentaContable>(`${this.baseUrl}/buscar`, {
            params: new HttpParams().set('codigo', codigo)
        });
    }

    obtenerPorId(id: string) {
        return this.http.get<CuentaContable>(`${this.baseUrl}/${id}`);
    }

    crear(request: CuentaContableRequest) {
        return this.http.post<CuentaContable>(this.baseUrl, request);
    }

    actualizar(id: string, request: CuentaContableUpdateRequest) {
        return this.http.put<CuentaContable>(`${this.baseUrl}/${id}`, request);
    }
}
