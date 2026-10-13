import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type AccionAutorizacion = 'DESCUENTO' | 'ANULACION' | 'DEVOLUCION';

/** Token de un solo uso (12 h) que emite el backend tras validar el PIN de un supervisor. */
export interface AutorizacionSupervisor {
    token: string;
    supervisorId: number;
    supervisorUsername: string;
    /** ISO-8601 */
    expiraEn: string;
}

/**
 * Autorización de supervisor validada en el servidor (`POST /api/pos/autorizaciones`).
 *
 * El PIN ya no se comprueba en el navegador: el backend lo valida (supervisor ADMIN/GERENTE/SUPERADMIN
 * activo de esta empresa) y devuelve un token que el servidor exige después en la venta
 * (`autorizacionToken`) o en la anulación (cabecera `X-Autorizacion-Supervisor`).
 * Errores: 403 PIN no válido, 429 tras 5 fallos en 5 min.
 */
@Injectable({ providedIn: 'root' })
export class PosManagerAuthService {
    private readonly http = inject(HttpClient);

    /** DESCUENTO exige `porcentaje` (el % que se quiere autorizar); ANULACION y DEVOLUCION exigen `ventaId`. */
    autorizar(
        accion: AccionAutorizacion,
        pin: string,
        extra: { porcentaje?: number; ventaId?: number } = {},
    ): Observable<AutorizacionSupervisor> {
        return this.http.post<AutorizacionSupervisor>(
            `${environment.apiUrls.pos}/autorizaciones`,
            { accion, pin, ...extra },
        );
    }
}
