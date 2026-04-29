import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';

export interface Promocion {
    id?: number;
    nombre: string;
    descripcion?: string;
    tipo: 'PORCENTAJE' | 'MONTO_FIJO';
    valor: number;
    alcance: 'PRODUCTO' | 'CATEGORIA' | 'CARRITO';
    codigoCupon?: string;
    limiteUsos?: number;
    usosActuales: number;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PromotionsService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/promociones`;

    getAll(): Observable<Promocion[]> {
        return this.http.get<Promocion[]>(this.baseUrl).pipe(
            catchError(() => of([]))
        );
    }

    create(dto: Omit<Promocion, 'id' | 'usosActuales'>): Observable<Promocion> {
        return this.http.post<Promocion>(this.baseUrl, { ...dto, usosActuales: 0 });
    }

    update(id: number, dto: Partial<Promocion>): Observable<Promocion> {
        return this.http.put<Promocion>(`${this.baseUrl}/${id}`, dto, { params: this.tenantParams() });
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`, { params: this.tenantParams() });
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }
}
