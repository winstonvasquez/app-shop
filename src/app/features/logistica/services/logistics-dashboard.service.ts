import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LogisticsKpi } from '../models/logistics-dashboard.model';

@Injectable({ providedIn: 'root' })
export class LogisticsDashboardService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/dashboard`;

    getKpis(from: string, to: string): Observable<LogisticsKpi> {
        const params = new HttpParams()
            .set('from', from)
            .set('to', to);
        return this.http.get<LogisticsKpi>(this.baseUrl, { params });
    }
}
