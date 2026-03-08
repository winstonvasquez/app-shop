import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { Movimiento, MovimientoItem, CreateMovimientoDto } from '../models/movimiento.model';

// Re-exportar tipos para que estén disponibles desde el servicio
export type { Movimiento, MovimientoItem, CreateMovimientoDto };

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private http = inject(HttpClient);
  private baseUrl = '/api/movimientos';

  getMovimientos(companyId: string, params?: { tipo?: string; page?: number; size?: number }): Observable<any> {
    let httpParams = new HttpParams().set('companyId', companyId);
    if (params?.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params?.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params?.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    return this.http.get<any>(this.baseUrl, { params: httpParams });
  }

  getMovimientoById(id: string, companyId: string): Observable<Movimiento> {
    return this.http.get<Movimiento>(`${this.baseUrl}/${id}`, { params: { companyId } });
  }

  crearEntrada(data: CreateMovimientoDto, companyId: string): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.baseUrl}/entrada`, data, { params: { companyId } });
  }

  crearSalida(data: CreateMovimientoDto, companyId: string): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.baseUrl}/salida`, data, { params: { companyId } });
  }
}
