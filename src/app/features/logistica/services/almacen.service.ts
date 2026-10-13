import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import type { PageResponse } from '@core/models/pagination.model';
import { Almacen, CreateAlmacenDto, Pagination } from '../models/almacen.model';
import { toHttpParams } from '@core/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrls.logistics}/api/almacenes`;

  getAlmacenes(companyId: string, params?: { page?: number; size?: number; sort?: string }): Observable<Pagination<Almacen>> {
    const httpParams = toHttpParams({ companyId, ...params });
    return this.http.get<Pagination<Almacen>>(this.baseUrl, { params: httpParams });
  }

  /**
   * Variante pura (Promise) pensada para adapters `ServerSelectDataSource`
   * (ver `almacenSelectSource`). No muta ningún signal de estado compartido —
   * solo envuelve la misma llamada HTTP con `search` server-side.
   */
  async searchPage(companyId: number, page = 0, size = 10, search?: string): Promise<PageResponse<Almacen>> {
    let httpParams = toHttpParams({
        companyId,
        page,
        size,
        search,
    });
    return firstValueFrom(this.http.get<PageResponse<Almacen>>(this.baseUrl, { params: httpParams }));
  }

  getAlmacenById(id: string, companyId: string): Observable<Almacen> {
    return this.http.get<Almacen>(`${this.baseUrl}/${id}`, { params: { companyId } });
  }

  createAlmacen(data: CreateAlmacenDto, companyId: string): Observable<Almacen> {
    return this.http.post<Almacen>(this.baseUrl, data, { params: { companyId, tenantId: companyId } });
  }

  updateAlmacen(id: string, data: CreateAlmacenDto, companyId: string): Observable<Almacen> {
    return this.http.put<Almacen>(`${this.baseUrl}/${id}`, data, { params: { companyId } });
  }
}
