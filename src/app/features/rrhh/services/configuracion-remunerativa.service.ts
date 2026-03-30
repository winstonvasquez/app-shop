import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

export interface TramoRenta5ta { desdeUit: number; hastaUit: number; tasa: number; }
export interface AfpTasas { jubilacion: number; seguroInvalidez: number; comision: number; }
export interface ConfiguracionRemunerativa {
    anio: number;
    uit: number;
    essaludTasa: number;
    onpTasa: number;
    asignacionFamiliar: number;
    tramosRenta5ta: TramoRenta5ta[];
    integra: AfpTasas;
    prima: AfpTasas;
    profuturo: AfpTasas;
    habitat: AfpTasas;
}

/** Valores de fallback si el backend no responde */
export const CONFIG_DEFAULT: ConfiguracionRemunerativa = {
    anio: 2024,
    uit: 5150,
    essaludTasa: 0.09,
    onpTasa: 0.13,
    asignacionFamiliar: 102,
    tramosRenta5ta: [
        { desdeUit: 0,  hastaUit: 5,        tasa: 0.08 },
        { desdeUit: 5,  hastaUit: 20,        tasa: 0.14 },
        { desdeUit: 20, hastaUit: 35,        tasa: 0.17 },
        { desdeUit: 35, hastaUit: 45,        tasa: 0.20 },
        { desdeUit: 45, hastaUit: Infinity,  tasa: 0.30 },
    ],
    integra:   { jubilacion: 0.10, seguroInvalidez: 0.01748, comision: 0.00874 },
    prima:     { jubilacion: 0.10, seguroInvalidez: 0.01842, comision: 0.01069 },
    profuturo: { jubilacion: 0.10, seguroInvalidez: 0.01842, comision: 0.01587 },
    habitat:   { jubilacion: 0.10, seguroInvalidez: 0.01842, comision: 0.00773 },
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionRemunerativaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.hr}/api/configuracion/remunerativa`;

    async getConfiguracion(): Promise<ConfiguracionRemunerativa> {
        try {
            return await firstValueFrom(this.http.get<ConfiguracionRemunerativa>(this.baseUrl));
        } catch {
            return CONFIG_DEFAULT;
        }
    }
}
