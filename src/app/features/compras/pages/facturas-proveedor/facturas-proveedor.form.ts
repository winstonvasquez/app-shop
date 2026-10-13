import { MONEDA } from '@shared/constants/sunat.constants';
import { RegistrarFacturaRequest } from '../../models/factura-proveedor.model';

/**
 * Forma cruda de `facturaForm.value`. Los controles son nullables y el array de
 * ítems llega sin tipar desde el `FormArray`, de ahí `Record<string, unknown>[]`.
 */
export interface ValoresFormularioFactura {
    ordenCompraId?: string | null;
    serie?: string | null;
    numero?: string | null;
    tipoDocumento?: string | null;
    fechaEmision?: string | null;
    fechaVencimiento?: string | null;
    moneda?: string | null;
    observaciones?: string | null;
    items?: Record<string, unknown>[] | null;
}

/**
 * Traduce el formulario del drawer al request de registro de factura de proveedor.
 *
 * Dos rellenos con semántica distinta, y la diferencia importa:
 * - `??` en los campos OBLIGATORIOS del request (`ordenCompraId`, `serie`,
 *   `numero`, `fechaEmision`): el control nunca debería estar vacío porque tiene
 *   `Validators.required`, así que solo se protege el `null` del control y se
 *   manda `''` — que el backend rechaza con un 400 explícito.
 * - `|| undefined` en los OPCIONALES (`fechaVencimiento`, `observaciones`, `sku`,
 *   `ordenItemId`): una cadena vacía NO es un dato, es «el usuario no llenó esto».
 *   Debe viajar ausente y no como `''`, para no sobrescribir con vacío.
 *
 * `tipoDocumento` y `moneda` caen a los defaults del alta (FACTURA / PEN) cuando
 * el control viene nulo.
 */
export function construirRegistrarFacturaRequest(fv: ValoresFormularioFactura): RegistrarFacturaRequest {
    return {
        ordenCompraId: fv.ordenCompraId ?? '',
        serie: fv.serie ?? '',
        numero: fv.numero ?? '',
        tipoDocumento: fv.tipoDocumento ?? 'FACTURA',
        fechaEmision: fv.fechaEmision ?? '',
        fechaVencimiento: fv.fechaVencimiento || undefined,
        moneda: fv.moneda ?? MONEDA.PEN,
        observaciones: fv.observaciones || undefined,
        items: (fv.items ?? []).map((i) => ({
            ordenItemId: (i['ordenItemId'] as string) || undefined,
            productoNombre: i['productoNombre'] as string,
            sku: (i['sku'] as string) || undefined,
            cantidad: Number(i['cantidad']),
            precioUnitario: Number(i['precioUnitario']),
        })),
    };
}

/**
 * Semáforo del ciclo de aprobación interno de la factura: pendiente avisa,
 * aprobada confirma, rechazada alarma. Cualquier estado no contemplado se pinta
 * neutro en vez de romper la fila.
 */
export function claseBadgeEstadoFactura(estado: string): string {
    const mapa: Record<string, string> = {
        PENDIENTE: 'badge badge-warning',
        APROBADA: 'badge badge-success',
        RECHAZADA: 'badge badge-error',
    };
    return mapa[estado] ?? 'badge badge-neutral';
}

/**
 * Resultado del match a 3 vías (OC ↔ recepción ↔ factura). Solo el match total es
 * verde; el parcial avisa porque exige revisión manual, y CUALQUIER otro
 * resultado conocido es una discrepancia y va en rojo. Sin dato todavía = neutro.
 */
export function claseBadgeMatch(match: string | undefined): string {
    if (!match) return 'badge badge-neutral';
    const mapa: Record<string, string> = {
        OK_TOTAL: 'badge badge-success',
        OK_PARCIAL: 'badge badge-warning',
    };
    return mapa[match] ?? 'badge badge-error';
}

/**
 * Estado de la validación SUNAT del comprobante. Solo ACEPTADA es verde y solo
 * RECHAZADA es roja; el resto (en proceso, observada…) queda en ámbar porque aún
 * puede resolverse. Sin validar todavía = neutro.
 */
export function claseBadgeSunat(estadoSunat: string | undefined): string {
    if (!estadoSunat) return 'badge badge-neutral';
    const mapa: Record<string, string> = {
        ACEPTADA: 'badge badge-success',
        RECHAZADA: 'badge badge-error',
    };
    return mapa[estadoSunat] ?? 'badge badge-warning';
}
