import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import { AccountingMapping, AccountingMappingRequest, AccountingMappingFiltros } from '../models/accounting-mapping.model';
import { toHttpParams } from '@core/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class AccountingMappingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/accounting-mappings`;

    /**
     * Listado paginado con filtros avanzados opcionales (ronda de filtros 2026-07-27):
     * tipo de evento, estado activo/inactivo, cuenta débito/crédito, rango de fecha de
     * creación y búsqueda de texto. Reemplaza el `List<T>` sin filtros de antes — el
     * backend ahora pagina y filtra server-side (`AccountingMappingController.listar`).
     */
    listar(filtros: AccountingMappingFiltros = {}): Observable<PageResponse<AccountingMapping>> {
        let params = toHttpParams({
            page: filtros.page ?? 0,
            size: filtros.size ?? 20,
            eventType: filtros.eventType,
            activo: filtros.activo,
            debitAccount: filtros.debitAccount,
            creditAccount: filtros.creditAccount,
            fechaCreacionDesde: filtros.fechaCreacionDesde,
            fechaCreacionHasta: filtros.fechaCreacionHasta,
            q: filtros.q,
        });
        return this.http.get<PageResponse<AccountingMapping>>(this.baseUrl, { params });
    }

    obtenerPorId(id: string): Observable<AccountingMapping> {
        return this.http.get<AccountingMapping>(`${this.baseUrl}/${id}`);
    }

    obtenerPorEventType(eventType: string): Observable<AccountingMapping> {
        return this.http.get<AccountingMapping>(`${this.baseUrl}/event-type/${eventType}`);
    }

    crear(req: AccountingMappingRequest): Observable<AccountingMapping> {
        return this.http.post<AccountingMapping>(this.baseUrl, req);
    }

    actualizar(id: string, req: AccountingMappingRequest): Observable<AccountingMapping> {
        return this.http.put<AccountingMapping>(`${this.baseUrl}/${id}`, req);
    }

    /** Desactiva lógicamente el mapeo (el backend no hace hard delete). */
    eliminar(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    /**
     * Dispara un asiento contable REAL de prueba hacia Contabilidad usando el
     * mapeo configurado para `eventType`. Monto mínimo por defecto (0.01) para
     * no ensuciar los libros con montos significativos.
     */
    probar(eventType: string, amount = 0.01): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/test/${eventType}?amount=${amount}`, {});
    }
}
