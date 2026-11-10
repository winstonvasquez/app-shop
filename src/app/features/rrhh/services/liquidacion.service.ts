import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { LiquidacionCese } from '../models/liquidacion.model';

/** Cliente de LiquidacionCeseController (/hr/api/liquidaciones). El registro es una foto: no genera pago ni asiento. */
@Injectable({ providedIn: 'root' })
export class LiquidacionService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/liquidaciones`;

    /** 400 si el empleado no tiene fecha de cese; 404 si no existe o es de otra empresa. */
    calcular(employeeId: number): Promise<LiquidacionCese> {
        return firstValueFrom(this.http.get<LiquidacionCese>(`${this.baseUrl}/calculo`, { params: { employeeId } }));
    }

    /** 409 si ya hay una liquidación registrada para ese empleado y fecha de cese. */
    registrar(employeeId: number, observaciones?: string): Promise<LiquidacionCese> {
        return firstValueFrom(this.http.post<LiquidacionCese>(this.baseUrl, { employeeId, observaciones }));
    }

    listar(): Promise<LiquidacionCese[]> {
        return firstValueFrom(this.http.get<LiquidacionCese[]>(this.baseUrl));
    }
}
