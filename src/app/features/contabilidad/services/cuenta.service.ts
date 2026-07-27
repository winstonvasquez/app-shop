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
    aceptaMovimiento: boolean;
    estado: string;
}

@Injectable({ providedIn: 'root' })
export class CuentaService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.accounting}/api/v1/contabilidad/cuentas`;

    listarPorNivel(nivel: number) {
        return this.http.get<CuentaContable[]>(this.baseUrl, {
            params: new HttpParams().set('nivel', nivel.toString())
        });
    }

    listarTodas() {
        return this.http.get<CuentaContable[]>(`${this.baseUrl}/todas`);
    }

    /** Listado paginado con filtros server-side (backend: GET /cuentas, ronda 2026-07-27). */
    listarPaginado(options?: {
        page?: number; size?: number; nivel?: number;
        busqueda?: string; tipo?: string; estado?: string;
    }): Observable<PageResponse<CuentaContable>> {
        let params = new HttpParams();
        if (options?.page !== undefined) params = params.set('page', options.page.toString());
        if (options?.size !== undefined) params = params.set('size', options.size.toString());
        if (options?.nivel !== undefined) params = params.set('nivel', options.nivel.toString());
        if (options?.busqueda) params = params.set('busqueda', options.busqueda);
        if (options?.tipo) params = params.set('tipo', options.tipo);
        if (options?.estado) params = params.set('estado', options.estado);
        return this.http.get<PageResponse<CuentaContable>>(this.baseUrl, { params });
    }

    buscarPorCodigo(codigo: string) {
        return this.http.get<CuentaContable>(`${this.baseUrl}/buscar`, {
            params: new HttpParams().set('codigo', codigo)
        });
    }
}
