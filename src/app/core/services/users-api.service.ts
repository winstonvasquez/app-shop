import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { CompanyResponse, UserCompanyResponse } from '@core/models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UsersApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.users;

    getCompanies(): Observable<CompanyResponse[]> {
        return this.http.get<CompanyResponse[]>(`${this.baseUrl}/api/companies`);
    }

    createCompany(company: Partial<CompanyResponse>): Observable<CompanyResponse> {
        return this.http.post<CompanyResponse>(`${this.baseUrl}/api/companies`, company);
    }

    getUserCompanies(userId: number): Observable<UserCompanyResponse[]> {
        return this.http.get<UserCompanyResponse[]>(`${this.baseUrl}/api/user-companies/${userId}`);
    }
}
