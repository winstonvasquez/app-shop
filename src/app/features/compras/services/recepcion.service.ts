import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Recepcion } from '../models/orden-compra.model';

export interface RecepcionPage {
    content: Recepcion[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Injectable({ providedIn: 'root' })
export class RecepcionService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/purchases/api/recepciones`;

    getRecepciones(page = 0, size = 10, estado?: string): Observable<RecepcionPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (estado) params = params.set('estado', estado);

        return this.http.get<unknown>(this.baseUrl, { params }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as Recepcion[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                    size: (r['size'] as number) ?? size,
                    number: (r['number'] as number) ?? page,
                } as RecepcionPage;
            })
        );
    }

    getRecepcionById(id: string): Observable<Recepcion> {
        return this.http.get<Recepcion>(`${this.baseUrl}/${id}`);
    }

    createRecepcion(recepcion: Partial<Recepcion>): Observable<Recepcion> {
        return this.http.post<Recepcion>(this.baseUrl, recepcion);
    }

    confirmarRecepcion(id: string): Observable<Recepcion> {
        return this.http.post<Recepcion>(`${this.baseUrl}/${id}/confirmar`, {});
    }
}
