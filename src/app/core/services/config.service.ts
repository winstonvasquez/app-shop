import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface MedioPago {
    id: number;
    codigo: string;
    nombre: string;
    iconoUrl: string;
    activo: boolean;
}

export interface Certificacion {
    id: number;
    codigo: string;
    nombre: string;
    iconoUrl: string;
    activo: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrls.sales}/api/ventas/config`;

    getMediosPago(): Observable<MedioPago[]> {
        return this.http.get<MedioPago[]>(`${this.apiUrl}/medios-pago`);
    }

    getCertificaciones(): Observable<Certificacion[]> {
        return this.http.get<Certificacion[]>(`${this.apiUrl}/certificaciones`);
    }
}
