import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

/** Respuesta del backend al verificar el PIN de un supervisor. */
export interface SupervisorAuthResponse {
    authorized: boolean;
    userId: number | null;
    username: string | null;
    rol: string | null;
}

/**
 * Valida el PIN de un supervisor contra microshopusers para autorizar
 * operaciones sensibles del POS (ej: descuentos por encima del umbral).
 * Reemplaza la validación local "acepta cualquier PIN".
 */
@Injectable({ providedIn: 'root' })
export class PosManagerAuthService {
    private readonly http = inject(HttpClient);

    verificarPinSupervisor(pin: string, companyId: number): Observable<SupervisorAuthResponse> {
        return this.http.post<SupervisorAuthResponse>(
            `${environment.apiUrls.users}/auth/verify-supervisor-pin`,
            null,
            { params: { pin, companyId: String(companyId) } },
        );
    }
}
