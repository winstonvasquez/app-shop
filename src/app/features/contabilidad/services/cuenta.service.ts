import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';

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
        let params = new HttpParams();
        if (options?.page !== undefined) params = params.set('page', options.page.toString());
        if (options?.size !== undefined) params = params.set('size', options.size.toString());
        if (options?.nivel !== undefined) params = params.set('nivel', options.nivel.toString());
        if (options?.busqueda) params = params.set('busqueda', options.busqueda);
        if (options?.tipo) params = params.set('tipo', options.tipo);
        if (options?.estado) params = params.set('estado', options.estado);
        if (options?.aceptaMovimiento !== undefined) params = params.set('aceptaMovimiento', String(options.aceptaMovimiento));
        if (options?.esAnalitica !== undefined) params = params.set('esAnalitica', String(options.esAnalitica));
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
