import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Sucursal {
    id: number;
    companyId: number;
    nombre: string;
    direccion: string | null;
    ubigeo: string | null;
    telefono: string | null;
    serieBoleta: string | null;
    serieFactura: string | null;
    almacenId: number | null;
    activo: boolean;
}

export interface SucursalInput {
    companyId: number;
    nombre: string;
    direccion?: string;
    ubigeo?: string;
    telefono?: string;
    serieBoleta?: string;
    serieFactura?: string;
    almacenId?: number;
}

@Injectable({ providedIn: 'root' })
export class SucursalService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.pos}/sucursales`;

    list(companyId: number): Observable<Sucursal[]> {
        return this.http.get<Sucursal[]>(this.base, {
            params: new HttpParams().set('companyId', companyId.toString())
        });
    }

    get(id: number): Observable<Sucursal> {
        return this.http.get<Sucursal>(`${this.base}/${id}`);
    }

    create(input: SucursalInput): Observable<Sucursal> {
        return this.http.post<Sucursal>(this.base, input);
    }

    update(id: number, input: SucursalInput): Observable<Sucursal> {
        return this.http.put<Sucursal>(`${this.base}/${id}`, input);
    }

    deactivate(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}
