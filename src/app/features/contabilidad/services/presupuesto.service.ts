import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface DetallePresupuesto {
    id: string;
    codigoCuenta: string;
    mes: number;
    montoPresupuestado: number;
}

export interface Presupuesto {
    id: string;
    anno: number;
    nombre: string;
    estado: string;
    total: number;
    fechaCreacion: string;
    detalles: DetallePresupuesto[];
}

export interface MesComparativo {
    mes: number;
    presupuestado: number;
    ejecutado: number;
    variacion: number;
}

export interface ComparativoPresupuesto {
    codigoCuenta: string;
    nombreCuenta: string;
    meses: MesComparativo[];
    totalPresupuestado: number;
    totalEjecutado: number;
    variacion: number;
    porcentajeEjecucion: number;
}

export interface PresupuestoRequest {
    anno: number;
    nombre: string;
    detalles: Array<{ codigoCuenta: string; mes: number; montoPresupuestado: number }>;
}

@Injectable({ providedIn: 'root' })
export class PresupuestoService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/presupuesto`;

    listar() {
        return this.http.get<Presupuesto[]>(this.base);
    }

    obtener(id: string) {
        return this.http.get<Presupuesto>(`${this.base}/${id}`);
    }

    comparativo(anno: number) {
        return this.http.get<ComparativoPresupuesto[]>(`${this.base}/${anno}/comparativo`);
    }

    crear(req: PresupuestoRequest) {
        return this.http.post<Presupuesto>(this.base, req);
    }

    aprobar(id: string) {
        return this.http.put<Presupuesto>(`${this.base}/${id}/aprobar`, {});
    }
}
