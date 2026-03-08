import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Recepcion {
    id?: string;
    ordenCompraId: string;
    ordenCompraCodigo?: string;
    numeroGuia?: string;
    transportista?: string;
    fechaRecepcion: string;
    responsable?: string;
    almacenDestino: string;
    estado: string;
    observaciones?: string;
}

export interface RecepcionPage {
    content: Recepcion[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

@Injectable({ providedIn: 'root' })
export class RecepcionService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/purchases/api/recepciones`;

    getRecepciones(page = 0, size = 20, estado?: string): Observable<RecepcionPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get<RecepcionPage>(this.baseUrl, { params });
    }

    getRecepcionById(id: string): Observable<Recepcion> {
        return this.http.get<Recepcion>(`${this.baseUrl}/${id}`);
    }

    createRecepcion(recepcion: Recepcion): Observable<Recepcion> {
        return this.http.post<Recepcion>(this.baseUrl, recepcion);
    }

    confirmarRecepcion(id: string): Observable<Recepcion> {
        return this.http.post<Recepcion>(`${this.baseUrl}/${id}/confirmar`, {});
    }
}
