import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { Almacen, CreateAlmacenDto, Pagination } from '../models/almacen.model';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private http = inject(HttpClient);
  private baseUrl = '/logistics/api/almacenes';

  getAlmacenes(companyId: string, params?: { page?: number; size?: number; sort?: string }): Observable<Pagination<Almacen>> {
    let httpParams = new HttpParams().set('companyId', companyId);
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<Pagination<Almacen>>(this.baseUrl, { params: httpParams });
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
