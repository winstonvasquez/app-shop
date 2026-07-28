import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import type { PageResponse } from '@core/models/pagination.model';

export interface CuentaBancaria {
    id: string;
    banco: string;
    numeroCuenta: string;
    moneda: string;
    codigoCuentaPcge: string;
    activo: boolean;
}

export interface PartidaConciliacion {
    id: string;
    origen: 'BANCO' | 'LIBRO';
    fecha: string;
    descripcion: string;
    referencia: string;
    monto: number;
    tipoMovimiento: 'DEBITO' | 'CREDITO';
    conciliado: boolean;
}

export interface Conciliacion {
    id: string;
    banco: string;
    numeroCuenta: string;
    periodo: string;
    fechaInicio: string;
    fechaFin: string;
    saldoLibroFin: number;
    saldoBancoFin: number;
    diferencia: number;
    estado: string;
    partidasConciliadas: number;
    partidasPendientes: number;
    partidas: PartidaConciliacion[];
}

export interface ConciliacionRequest {
    cuentaBancariaId: string;
    periodoId: string;
    fechaInicio: string;
    fechaFin: string;
    saldoBancoInicio: number;
    saldoBancoFin: number;
}

export interface PartidaConciliacionRequest {
    origen: 'BANCO' | 'LIBRO';
    fecha: string;
    descripcion: string;
    referencia: string;
    monto: number;
    tipoMovimiento: 'DEBITO' | 'CREDITO';
}

@Injectable({ providedIn: 'root' })
export class ConciliacionBancariaService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad`;

    /**
     * Los dos listados del backend devuelven `Page<...>` (`BankAccountController.getAll` y
     * `ConciliacionBancariaController.listar`), no arrays. Tiparlos como array compilaba y
     * la vista hacía `@for` sobre el objeto Page → `TypeError: newCollection[Symbol.iterator]
     * is not a function`, o sea que la pantalla de conciliación no listaba nada.
     * Se desempaqueta aquí para que los llamadores sigan recibiendo un array.
     */
    listarCuentas() {
        return this.http.get<PageResponse<CuentaBancaria>>(`${this.base}/cuentas-bancarias`).pipe(
            map(res => res?.content ?? [])
        );
    }

    listar() {
        return this.http.get<PageResponse<Conciliacion>>(`${this.base}/conciliacion`).pipe(
            map(res => res?.content ?? [])
        );
    }

    obtener(id: string) {
        return this.http.get<Conciliacion>(`${this.base}/conciliacion/${id}`);
    }

    crear(req: ConciliacionRequest) {
        return this.http.post<Conciliacion>(`${this.base}/conciliacion`, req);
    }

    agregarPartida(conciliacionId: string, req: PartidaConciliacionRequest) {
        return this.http.post<Conciliacion>(`${this.base}/conciliacion/${conciliacionId}/partidas`, req);
    }

    marcarConciliada(conciliacionId: string, partidaId: string) {
        return this.http.put<Conciliacion>(
            `${this.base}/conciliacion/${conciliacionId}/partidas/${partidaId}/conciliar`, {}
        );
    }

    cerrar(conciliacionId: string) {
        return this.http.put<Conciliacion>(`${this.base}/conciliacion/${conciliacionId}/cerrar`, {});
    }
}
