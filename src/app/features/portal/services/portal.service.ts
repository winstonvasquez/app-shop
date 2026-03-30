import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SaasPlanInfo, SaasRegisterPayload } from '../../../core/models/saas.model';

@Injectable({ providedIn: 'root' })
export class PortalService {
    private readonly http = inject(HttpClient);

    getPlans(): Observable<SaasPlanInfo[]> {
        return this.http.get<SaasPlanInfo[]>('/users/api/saas/plans');
    }

    register(payload: SaasRegisterPayload): Observable<unknown> {
        return this.http.post('/users/api/saas/register', payload);
    }
}
