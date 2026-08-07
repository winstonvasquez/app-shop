import { Injectable, Signal, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

/** Opción de un nivel del ubigeo. Misma forma que `CatalogOption`, a propósito. */
export interface UbigeoOption {
    codigo: string;
    valor: string;
}

/**
 * Ubigeo oficial del INEI (25 departamentos / 196 provincias / 1874 distritos), servido por
 * microshopusers desde `GET /users/api/ubigeo/**`.
 *
 * Cachea un signal por nivel y clave, igual que `CatalogService`, y dispara cada fetch una sola
 * vez: la tabla es inmutable, así que una respuesta ya recibida nunca queda obsoleta.
 *
 * El código de distrito (6 dígitos) es el que exige SUNAT en la guía de remisión electrónica —
 * por eso lo que se persiste en una dirección es SIEMPRE el código, no el nombre.
 */
@Injectable({ providedIn: 'root' })
export class UbigeoService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.users}/api/ubigeo`;

    private readonly cache = new Map<string, ReturnType<typeof signal<UbigeoOption[]>>>();
    private readonly inflight = new Set<string>();

    /** Los 25 departamentos. */
    departamentos(): Signal<UbigeoOption[]> {
        return this.nivel('departamentos', `${this.base}/departamentos`);
    }

    /**
     * Provincias del departamento. Con `departamentoCodigo` vacío devuelve un signal vacío sin
     * llamar al backend: es el estado normal mientras el usuario no ha elegido departamento.
     */
    provincias(departamentoCodigo: string): Signal<UbigeoOption[]> {
        if (!departamentoCodigo) return this.vacio();
        return this.nivel(
            `provincias:${departamentoCodigo}`,
            `${this.base}/departamentos/${encodeURIComponent(departamentoCodigo)}/provincias`,
        );
    }

    /** Distritos de la provincia. El `codigo` de cada opción es el ubigeo de 6 dígitos. */
    distritos(provinciaCodigo: string): Signal<UbigeoOption[]> {
        if (!provinciaCodigo) return this.vacio();
        return this.nivel(
            `distritos:${provinciaCodigo}`,
            `${this.base}/provincias/${encodeURIComponent(provinciaCodigo)}/distritos`,
        );
    }

    private readonly vacioSig = signal<UbigeoOption[]>([]);

    private vacio(): Signal<UbigeoOption[]> {
        return this.vacioSig;
    }

    private nivel(clave: string, url: string): Signal<UbigeoOption[]> {
        let sig = this.cache.get(clave);
        if (!sig) {
            sig = signal<UbigeoOption[]>([]);
            this.cache.set(clave, sig);
        }
        if (!this.inflight.has(clave)) {
            this.inflight.add(clave);
            firstValueFrom(this.http.get<UbigeoOption[]>(url))
                .then(opts => this.cache.get(clave)!.set(opts ?? []))
                .catch(() => { /* sin conexión → el select queda vacío, no rompe el formulario */ })
                .finally(() => this.inflight.delete(clave));
        }
        return sig;
    }
}
