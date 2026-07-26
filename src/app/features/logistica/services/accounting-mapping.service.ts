import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AccountingMapping, AccountingMappingRequest } from '../models/accounting-mapping.model';

@Injectable({ providedIn: 'root' })
export class AccountingMappingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/accounting-mappings`;

    listar(): Observable<AccountingMapping[]> {
        return this.http.get<AccountingMapping[]>(this.baseUrl);
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
