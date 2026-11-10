import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { toHttpParams } from '@core/utils/http-params.util';

export interface ZonaEnvio {
    id: number;
    nombre: string;
    departamento: string;
    provincia: string;
    distrito: string;
    costoEnvio: number;
    tiempoEstimadoDias: number;
    /** Umbral S/ de envío gratis (subtotal − cupón >= umbral); null/ausente = regla apagada. */
    envioGratisDesde?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ZonaEnvioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/envio/zonas`;

    private readonly _envioGratisDesde = signal<number | null>(null);
    private umbralCargado = false;
    /** Umbral real del backend; null hasta que se conozca o si la tienda no ofrece envío gratis. */
    readonly envioGratisDesde = this._envioGratisDesde.asReadonly();

    /** Sin zona para el distrito, el backend devuelve las del departamento (si se informa). */
    getZonas(distrito?: string, departamento?: string): Observable<ZonaEnvio[]> {
        const params = toHttpParams({ distrito, departamento });
        return this.http.get<ZonaEnvio[]>(this.baseUrl, { params }).pipe(tap(z => this.registrarUmbral(z)));
    }

    /** Carga el umbral una sola vez (carrito, inicio, tarjetas). Si falla, no se promete nada y se reintenta luego. */
    cargarUmbral(): void {
        if (this.umbralCargado) return;
        this.umbralCargado = true;
        this.getZonas().subscribe({ error: () => { this.umbralCargado = false; } });
    }

    // El umbral es global (mismo valor en todas las zonas): basta la primera que llegue.
    private registrarUmbral(zonas: readonly ZonaEnvio[]): void {
        if (zonas.length > 0) this._envioGratisDesde.set(zonas[0].envioGratisDesde ?? null);
    }
}
