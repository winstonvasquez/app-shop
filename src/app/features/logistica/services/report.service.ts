import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LogisticsReport, LogisticsReportPage, GenerateReportBody } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/reports`;

    list(companyId: string, page = 0, size = 20): Observable<LogisticsReportPage> {
        const params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<LogisticsReportPage>(this.baseUrl, { params });
    }

    generate(body: GenerateReportBody): Observable<LogisticsReport> {
        return this.http.post<LogisticsReport>(this.baseUrl, body);
    }

    getById(id: string): Observable<LogisticsReport> {
        return this.http.get<LogisticsReport>(`${this.baseUrl}/${id}`);
    }

    download(id: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' });
    }
}
