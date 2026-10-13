import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'];

export interface AdminSubscription {
    companyId: number;
    planCode: string;
    planName: string;
    status: string;
    trialEndsAt: string | null;
}

export interface AdminSubscriptionRequest {
    planCode: string;
    status: string;
}

/**
 * Plan/estado de la suscripción de una empresa — SOLO SUPERADMIN (backend: /api/saas/admin/**).
 * Tras un cambio el backend revoca las sesiones de los usuarios de la empresa.
 */
@Injectable({ providedIn: 'root' })
export class SaasSubscriptionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/saas/admin/companies`;

    get(companyId: number): Observable<AdminSubscription> {
        // 404 = la empresa aún no tiene suscripción: se devuelve vacía para que la UI pinte los selects;
        // el PUT la crea. Con el error, sólo se veía el mensaje y no había forma de asignarle un plan.
        return this.http.get<AdminSubscription>(`${this.baseUrl}/${companyId}/subscription`).pipe(
            catchError((error: HttpErrorResponse) => error.status === 404
                ? of<AdminSubscription>({ companyId, planCode: '', planName: 'Sin suscripción', status: '', trialEndsAt: null })
                : this.handleError(error)));
    }

    update(companyId: number, request: AdminSubscriptionRequest): Observable<AdminSubscription> {
        return this.http.put<AdminSubscription>(`${this.baseUrl}/${companyId}/subscription`, request).pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('SaasSubscriptionService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error)));
    }
}
