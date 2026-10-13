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
 * Texto de cierre tras una devolución, según CÓMO se cobró la venta (POSP-4). Sólo una venta en
 * efectivo se reembolsa en efectivo: para tarjeta/Yape/Plin/gift card, «entregue efectivo» manda
 * al cajero a sacar dinero de la caja que el backend no registra (faltante en el arqueo).
 * `total` es el `totalDevuelto` del backend, ya prorrateado por lo realmente cobrado.
 */
export function textoReembolso(metodoPago: string, pagos: readonly { metodo: string }[], total: number): string {
    const monto = `S/ ${total.toFixed(2)}`;
    if (metodoPago === 'EFECTIVO') return `Entregue ${monto} en efectivo al cliente.`;
    const medios = metodoPago === 'MIXTO' && pagos.length > 0
        ? [...new Set(pagos.map(p => p.metodo))].join(' + ')
        : metodoPago;
    const aviso = medios.includes('EFECTIVO') ? ' Sólo la parte cobrada en efectivo se entrega en caja.' : '';
    return `Reembolso por ${medios}: ${monto}.${aviso}`;
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
