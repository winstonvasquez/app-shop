import { Injectable, Signal, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

/** Opción de un catálogo servida desde erp_parameters (CATALOGO.<TABLA>.<CODIGO>). */
export interface CatalogOption {
    codigo: string;
    valor: string;
}

/**
 * Fuente única de opciones para dropdowns. Reemplaza los <option> hardcodeados:
 * las listas provienen de erp_parameters (microshopusers) vía
 * GET /users/api/system/parameters/catalog/{tabla}.
 *
 * Cachea un signal por tabla (compartido entre todos los componentes) y dispara
 * el fetch una sola vez. Uso: `catalog.options('AFP')()` en template, o el
 * componente reutilizable <app-catalog-select tabla="AFP">.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.users}/api/system/parameters/catalog`;

    private readonly cache = new Map<string, ReturnType<typeof signal<CatalogOption[]>>>();
    private readonly inflight = new Set<string>();

    /** Signal reactivo con las opciones del catálogo. Se llena async en el primer acceso. */
    options(tabla: string): Signal<CatalogOption[]> {
        let sig = this.cache.get(tabla);
        if (!sig) {
            sig = signal<CatalogOption[]>([]);
            this.cache.set(tabla, sig);
        }
        if (!this.inflight.has(tabla)) {
            this.inflight.add(tabla);
            firstValueFrom(this.http.get<CatalogOption[]>(`${this.base}/${encodeURIComponent(tabla)}`))
                .then(opts => this.cache.get(tabla)!.set(opts ?? []))
                .catch(() => { /* catálogo no disponible → queda vacío */ })
                .finally(() => this.inflight.delete(tabla));
        }
        return sig;
    }

    /** Versión imperativa (para lógica no reactiva). */
    async load(tabla: string): Promise<CatalogOption[]> {
        try {
            const opts = await firstValueFrom(
                this.http.get<CatalogOption[]>(`${this.base}/${encodeURIComponent(tabla)}`)
            );
            this.cache.get(tabla)?.set(opts ?? []);
            return opts ?? [];
        } catch {
            return [];
        }
    }

    /** Etiqueta de un código en un catálogo ya cargado (fallback: el propio código). */
    label(tabla: string, codigo: string | null | undefined): string {
        if (!codigo) return '';
        return this.cache.get(tabla)?.().find(o => o.codigo === codigo)?.valor ?? codigo;
    }
}
