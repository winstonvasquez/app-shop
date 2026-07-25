import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';

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
        return this.http.post<Promocion>(this.baseUrl, { ...dto, usosActuales: 0 }).pipe(
            catchError(this.handleError)
        );
    }

    update(id: number, dto: Partial<Promocion>): Observable<Promocion> {
        return this.http.put<Promocion>(`${this.baseUrl}/${id}`, dto, { params: this.tenantParams() }).pipe(
            catchError(this.handleError)
        );
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`, { params: this.tenantParams() }).pipe(
            catchError(this.handleError)
        );
    }

    private tenantParams(): HttpParams {
        const id = this.auth.currentUser()?.activeCompanyId;
        return id != null ? new HttpParams().set('companyId', String(id)) : new HttpParams();
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'Ocurrió un error desconocido';

        if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            const backendDetail = error.error?.detail || error.error?.message;
            if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.status === HTTP_STATUS.badRequest) {
                errorMessage = backendDetail || 'Datos de la promoción inválidos';
            } else if (error.status === HTTP_STATUS.notFound) {
                errorMessage = 'Promoción no encontrada';
            } else if (error.status === HTTP_STATUS.conflict) {
                errorMessage = backendDetail || 'La promoción ya existe o el código de cupón está en uso';
            } else if (error.status === HTTP_STATUS.internalServerError) {
                errorMessage = 'Error interno del servidor';
            } else {
                errorMessage = backendDetail || `Error ${error.status}: ${error.statusText}`;
            }
        }

        console.error('PromotionsService Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}
