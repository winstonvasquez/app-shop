import { DetalleVentaPosResponse, DevolucionPosRequest } from '../../models/venta-pos.model';

/** Una línea de la venta con el estado que el cajero le ha dado en la pantalla de devolución. */
export interface LineaDevolucion {
    detalle: DetalleVentaPosResponse;
    seleccionada: boolean;
    cantidadDevuelta: number;
    maxDevolvible: number;
    montoDevuelto: number;
}

/**
 * Arma el cuerpo de `POST /api/pos/ventas/{id}/devolucion`, o `null` si la devolución no es
 * emitible todavía.
 *
 * Dos condiciones bloquean la emisión, y las dos son de negocio, no de formulario:
 * - **sin motivo no hay nota de crédito** — el motivo es obligatorio para SUNAT;
 * - **una devolución vacía no existe**: una línea marcada con cantidad 0 no devuelve nada, así
 *   que no cuenta para decidir si hay algo que emitir.
 *
 * Las observaciones son libres: en blanco viajan como `undefined` y no como `''`.
 */
export function construirDevolucionRequest(
    valoresFormulario: { motivo?: unknown; observaciones?: unknown },
    lineas: readonly LineaDevolucion[],
): DevolucionPosRequest | null {
    const motivo = String(valoresFormulario.motivo ?? '');
    if (!motivo) return null;

    const seleccionadas = lineas
        .filter(l => l.seleccionada && l.cantidadDevuelta > 0)
        .map(l => ({ detalleVentaPosId: l.detalle.id, cantidadDevuelta: l.cantidadDevuelta }));
    if (seleccionadas.length === 0) return null;

    const observaciones = String(valoresFormulario.observaciones ?? '');
    return { motivo, observaciones: observaciones || undefined, lineas: seleccionadas };
}
