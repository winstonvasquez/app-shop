import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { environment } from '@env/environment';

export interface SelectOption<T = string> {
    value: T;
    label: string;
}

export interface Parametro {
    clave: string;
    valor: string;
    descripcion?: string;
}

// ── Constantes locales (fallback si el backend no tiene el endpoint) ──────────

const BADGE_ESTADO_PEDIDO: Record<string, string> = {
    PENDIENTE:  'badge-warning',
    PAGADO:     'badge-accent',
    ENVIADO:    'badge-accent',
    ENTREGADO:  'badge-success',
    CANCELADO:  'badge-error',
};

const BADGE_ESTADO_DEVOLUCION: Record<string, string> = {
    SOLICITADA:  'badge-warning',
    EN_REVISION: 'badge-accent',
    APROBADA:    'badge-success',
    RECHAZADA:   'badge-error',
};

const BADGE_ESTADO_PROMOCION: Record<string, string> = {
    ACTIVA:   'badge-success',
    INACTIVA: 'badge-neutral',
    VENCIDA:  'badge-warning',
};

const LABELS_ESTADO_PEDIDO: Record<string, string> = {
    PENDIENTE:  'Pendiente',
    PAGADO:     'Pagado',
    ENVIADO:    'Enviado',
    ENTREGADO:  'Entregado',
    CANCELADO:  'Cancelado',
};

const MOTIVOS_DEVOLUCION: SelectOption[] = [
    { value: 'DEFECTO',      label: 'Producto defectuoso' },
    { value: 'CAMBIO',       label: 'Cambio de producto' },
    { value: 'ERROR_PEDIDO', label: 'Error en el pedido' },
    { value: 'NO_LLEGÓ',     label: 'No llegó / perdido' },
    { value: 'OTRO',         label: 'Otro' },
];

const TIPOS_RESOLUCION: SelectOption[] = [
    { value: 'REEMBOLSO',       label: 'Reembolso' },
    { value: 'CAMBIO_PRODUCTO', label: 'Cambio de producto' },
    { value: 'CREDITO_TIENDA',  label: 'Crédito en tienda' },
];

const ESTADOS_DEVOLUCION: SelectOption[] = [
    { value: 'SOLICITADA',  label: 'Solicitada' },
    { value: 'EN_REVISION', label: 'En revisión' },
    { value: 'APROBADA',    label: 'Aprobada' },
    { value: 'RECHAZADA',   label: 'Rechazada' },
];

const TIPOS_PROMOCION: SelectOption[] = [
    { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
    { value: 'MONTO_FIJO', label: 'Monto fijo (S/)' },
];

const ALCANCES_PROMOCION: SelectOption[] = [
    { value: 'PRODUCTO',  label: 'Producto específico' },
    { value: 'CATEGORIA', label: 'Categoría' },
    { value: 'CARRITO',   label: 'Carrito mínimo' },
];

const ESTADOS_PEDIDO: SelectOption[] = [
    { value: 'PENDIENTE',  label: 'Pendiente' },
    { value: 'PAGADO',     label: 'Pagado' },
    { value: 'ENVIADO',    label: 'Enviado' },
    { value: 'ENTREGADO',  label: 'Entregado' },
    { value: 'CANCELADO',  label: 'Cancelado' },
];

// ── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VentasParametrosService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/parametros`;

    // ── Badge helpers (síncronos — usan constantes locales) ────────────────

    getBadgeEstadoPedido(estado: string): string {
        return BADGE_ESTADO_PEDIDO[estado] ?? 'badge-neutral';
    }

    getLabelEstadoPedido(estado: string): string {
        return LABELS_ESTADO_PEDIDO[estado] ?? estado;
    }

    getBadgeEstadoDevolucion(estado: string): string {
        return BADGE_ESTADO_DEVOLUCION[estado] ?? 'badge-neutral';
    }

    getBadgeEstadoPromocion(estado: string): string {
        return BADGE_ESTADO_PROMOCION[estado] ?? 'badge-neutral';
    }

    // ── Listas de opciones — intenta backend, cae a constantes locales ────

    getMotivosDevolucion(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=MOTIVO_DEVOLUCION`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(MOTIVOS_DEVOLUCION))
            );
    }

    getTiposResolucion(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=TIPO_RESOLUCION`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(TIPOS_RESOLUCION))
            );
    }

    getTiposPromocion(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=TIPO_PROMOCION`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(TIPOS_PROMOCION))
            );
    }

    getAlcancesPromocion(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=ALCANCE_PROMOCION`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(ALCANCES_PROMOCION))
            );
    }

    getEstadosPedido(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=ESTADO_PEDIDO`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(ESTADOS_PEDIDO))
            );
    }

    getEstadosDevolucion(): Observable<SelectOption[]> {
        return this.http
            .get<Parametro[]>(`${this.baseUrl}?grupo=ESTADO_DEVOLUCION`)
            .pipe(
                map(params => params.map(p => ({ value: p.clave, label: p.valor }))),
                catchError(() => of(ESTADOS_DEVOLUCION))
            );
    }
}
