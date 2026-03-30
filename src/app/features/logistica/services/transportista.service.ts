import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transportista, TransportistaPage, CreateTransportistaDto } from '../models/transportista.model';

@Injectable({ providedIn: 'root' })
export class TransportistaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/logistics/api/carriers';

    getTransportistas(companyId: string, page = 0, size = 10): Observable<TransportistaPage> {
        const params = new HttpParams()
            .set('companyId', companyId)
            .set('page', String(page))
            .set('size', String(size));
        return this.http.get<TransportistaPage>(this.baseUrl, { params });
    }

    getById(id: string, companyId: string): Observable<Transportista> {
        return this.http.get<Transportista>(`${this.baseUrl}/${id}`, { params: { companyId } });
    }

    create(dto: CreateTransportistaDto): Observable<Transportista> {
        return this.http.post<Transportista>(this.baseUrl, dto);
    }

    update(id: string, dto: Partial<CreateTransportistaDto>): Observable<Transportista> {
        return this.http.put<Transportista>(`${this.baseUrl}/${id}`, dto);
    }

    toggleActivo(id: string, active: boolean, companyId: string): Observable<Transportista> {
        return this.http.patch<Transportista>(`${this.baseUrl}/${id}/status`, { active }, { params: { companyId } });
    }
}
