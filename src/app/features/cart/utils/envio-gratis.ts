import type { DsProduct } from '@shared/ui/ds';

/**
 * Regla de envío gratis de la tienda. Espejo de `PedidoCommandService.costoEnvioAplicable` (ventas):
 * gratis si (subtotal − descuento de cupón) >= umbral; umbral null o <= 0 = regla apagada.
 * El umbral lo publica el backend (`envioGratisDesde` en las zonas): aquí no hay montos literales.
 */
export interface EstadoEnvioGratis {
    gratis: boolean;
    /** Lo que falta para alcanzar el umbral (0 si ya es gratis), en S/ con céntimos. */
    falta: number;
    /** 0–100, para la barra de progreso. */
    progreso: number;
}

const aCentimos = (s: number): number => Math.round(s * 100);

/** `null` cuando la tienda no ofrece envío gratis: no hay nada que prometer. */
export function estadoEnvioGratis(neto: number, umbral: number | null | undefined): EstadoEnvioGratis | null {
    if (umbral == null || !(umbral > 0)) return null;
    const gratis = aCentimos(neto) >= aCentimos(umbral);
    return {
        gratis,
        falta: gratis ? 0 : (aCentimos(umbral) - aCentimos(neto)) / 100,
        progreso: Math.min(100, Math.max(0, (neto / umbral) * 100)),
    };
}

/** Flete que cobra el servidor: 0 si se alcanza el umbral, la tarifa de la zona si no. */
export function costoEnvioAplicable(costoZona: number, neto: number, umbral: number | null | undefined): number {
    return estadoEnvioGratis(neto, umbral)?.gratis ? 0 : costoZona;
}

/**
 * Marca `shipFree` en las tarjetas con el umbral real (el mapeador compartido lo deduce de un 99 fijo).
 * Un producto cuyo precio solo ya alcanza el umbral envía gratis con 1 unidad; sin umbral, ninguno.
 */
export function conEnvioGratis(productos: readonly DsProduct[], umbral: number | null | undefined): DsProduct[] {
    return productos.map(p => ({ ...p, shipFree: estadoEnvioGratis(p.now, umbral)?.gratis ?? false }));
}
