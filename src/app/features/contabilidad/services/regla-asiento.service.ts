import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface DetalleRegla {
    codigoCuenta: string;
    campoOrigen: 'TOTAL' | 'BASE' | 'IGV' | 'ISC' | 'OTROS_CARGOS';
    movimientoTipo: 'DEBE' | 'HABER';
    porcentaje: number;
    orden: number;
}

export interface ReglaAsiento {
    id: string;
    transactionType: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
    detalles: DetalleRegla[];
    createdAt: string;
}

export interface ReglaAsientoRequest {
    transactionType: string;
    nombre: string;
    descripcion: string;
    detalles: DetalleRegla[];
}

export type TransactionType = 'VENTA' | 'COMPRA' | 'NOMINA' | 'TESORERIA' | 'INVENTARIO' | 'LOGISTICA';

@Injectable({ providedIn: 'root' })
export class ReglaAsientoService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/reglas-asiento`;

    listar()                                          { return this.http.get<ReglaAsiento[]>(this.base); }
    obtener(id: string)                               { return this.http.get<ReglaAsiento>(`${this.base}/${id}`); }
    crear(req: ReglaAsientoRequest)                   { return this.http.post<ReglaAsiento>(this.base, req); }
    actualizar(id: string, req: ReglaAsientoRequest)  { return this.http.put<ReglaAsiento>(`${this.base}/${id}`, req); }
    desactivar(id: string)                            { return this.http.delete<void>(`${this.base}/${id}`); }
}
