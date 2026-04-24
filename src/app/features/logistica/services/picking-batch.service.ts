import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PickingBatch, PickingBatchPage, GenerateBatchBody } from '../models/picking.model';

@Injectable({ providedIn: 'root' })
export class PickingBatchService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/picking/batches`;

    generate(body: GenerateBatchBody): Observable<PickingBatch> {
        return this.http.post<PickingBatch>(this.baseUrl, body);
    }

    start(id: string): Observable<PickingBatch> {
        return this.http.post<PickingBatch>(`${this.baseUrl}/${id}/start`, {});
    }

    complete(id: string): Observable<PickingBatch> {
        return this.http.post<PickingBatch>(`${this.baseUrl}/${id}/complete`, {});
    }

    list(page = 0, size = 20): Observable<PickingBatchPage> {
        const params = new HttpParams()
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<PickingBatchPage>(this.baseUrl, { params });
    }

    getById(id: string): Observable<PickingBatch> {
        return this.http.get<PickingBatch>(`${this.baseUrl}/${id}`);
    }
}
