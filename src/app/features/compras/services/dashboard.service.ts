import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DashboardCompras {
    totalComprasMes: number;
    ocEmitidas: number;
    ocPendientes: number;
    ocAprobadas: number;
    ocRecibidas: number;
    totalProveedores: number;
    proveedoresNuevos: number;
    comprasTrimestre: number;
    topProveedores: ProveedorMonto[];
    ultimasOC: OcReciente[];
}

export interface ProveedorMonto {
    nombre: string;
    ruc: string;
    monto: number;
    porcentaje: number;
}

export interface OcReciente {
    id: string;
    codigo: string;
    fechaEmision: string;
    proveedorNombre: string;
    total: number;
    estado: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrls.purchases}/api/dashboard`;

    getDashboardCompras(): Observable<DashboardCompras> {
        return this.http.get<DashboardCompras>(`${this.baseUrl}/compras`);
    }
}
