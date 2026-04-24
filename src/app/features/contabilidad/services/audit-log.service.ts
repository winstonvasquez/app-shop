import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

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

@Injectable({ providedIn: 'root' })
export class AuditLogService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/audit-log`;

    buscar(params: { entidadTipo?: string; desde?: string; hasta?: string; page?: number; size?: number }) {
        let p = new HttpParams();
        if (params.entidadTipo) p = p.set('entidadTipo', params.entidadTipo);
        if (params.desde) p = p.set('desde', params.desde);
        if (params.hasta) p = p.set('hasta', params.hasta);
        if (params.page !== undefined) p = p.set('page', params.page.toString());
        if (params.size !== undefined) p = p.set('size', params.size.toString());
        return this.http.get<PageResponse<AuditLog>>(this.base, { params: p });
    }

    porEntidad(entidadTipo: string, entidadId: string) {
        return this.http.get<AuditLog[]>(`${this.base}/${entidadTipo}/${entidadId}`);
    }
}
