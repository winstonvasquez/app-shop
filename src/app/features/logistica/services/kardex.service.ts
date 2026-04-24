import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { KardexEntry, KardexPage } from '../models/kardex.model';

export interface KardexFilter {
    productoId?: string;
    almacenId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}

@Injectable({ providedIn: 'root' })
export class KardexService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/kardex`;

    getEntries(filter: KardexFilter): Observable<KardexPage> {
        let params = new HttpParams()
            .set('page', String(filter.page ?? 0))
            .set('size', String(filter.size ?? 20));
        if (filter.productoId) params = params.set('productoId', filter.productoId);
        if (filter.almacenId) params = params.set('almacenId', filter.almacenId);
        if (filter.from) params = params.set('from', filter.from);
        if (filter.to) params = params.set('to', filter.to);
        return this.http.get<KardexPage>(this.baseUrl, { params });
    }

    getEntryById(id: string): Observable<KardexEntry> {
        return this.http.get<KardexEntry>(`${this.baseUrl}/${id}`);
    }
}
