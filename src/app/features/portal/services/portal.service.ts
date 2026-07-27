import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SaasModuleInfo, SaasPlanInfo, SaasRegisterPayload } from '../../../core/models/saas.model';
import { LandingContentSections } from '../../../core/models/landing-content.model';

@Injectable({ providedIn: 'root' })
export class PortalService {
    private readonly http = inject(HttpClient);

    getPlans(): Observable<SaasPlanInfo[]> {
        return this.http.get<SaasPlanInfo[]>('/users/api/saas/plans');
    }

    getModules(): Observable<SaasModuleInfo[]> {
        return this.http.get<SaasModuleInfo[]>('/users/api/saas/modules');
    }

    register(payload: SaasRegisterPayload): Observable<unknown> {
        return this.http.post('/users/api/saas/register', payload);
    }

    getLandingContent(): Observable<Partial<LandingContentSections>> {
        return this.http.get<Partial<LandingContentSections>>('/users/api/saas/landing-content');
    }
}
