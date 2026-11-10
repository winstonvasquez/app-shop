/** Filtros del toolbar de pedidos tal como los guardan los signals de la pantalla. */
export interface FiltrosPedidoCrudos {
    estado: string;
    cpeTipo: string;
    cpeEstado: string;
    metodoPago: string;
    estadoPago: string;
    fechaPedidoDesde?: string;
    fechaPedidoHasta?: string;
    cpeFechaEmisionDesde?: string;
    cpeFechaEmisionHasta?: string;
}

/** Filtros ya normalizados para el endpoint de pedidos (listado y exportación). */
export interface FiltrosPedido {
    estado?: string;
    cpeTipo?: string;
    cpeEstado?: string;
    metodoPago?: string;
    estadoPago?: string;
    fechaPedidoDesde?: string;
    fechaPedidoHasta?: string;
    cpeFechaEmisionDesde?: string;
    cpeFechaEmisionHasta?: string;
}

/**
 * Normaliza los filtros de pedidos antes de mandarlos al backend.
 *
 * Regla de negocio: **«ninguna opción elegida» es un select en `''`, y eso significa NO filtrar**,
 * no «filtrar por vacío». Un `''` que llegara al backend acotaría a los pedidos cuyo estado es la
 * cadena vacía — cero filas — así que se convierte en `undefined` para que el parámetro no viaje.
 * Los rangos de fecha ya llegan `undefined` cuando no hay rango y pasan tal cual.
 *
 * El listado y la exportación server-side comparten esta función a propósito: el XLSX tiene que
 * respetar exactamente los mismos filtros que la tabla en pantalla.
 */
export function filtrosDePedidos(c: FiltrosPedidoCrudos): FiltrosPedido {
    return {
        estado: c.estado || undefined,
        cpeTipo: c.cpeTipo || undefined,
        cpeEstado: c.cpeEstado || undefined,
        metodoPago: c.metodoPago || undefined,
        estadoPago: c.estadoPago || undefined,
        fechaPedidoDesde: c.fechaPedidoDesde,
        fechaPedidoHasta: c.fechaPedidoHasta,
        cpeFechaEmisionDesde: c.cpeFechaEmisionDesde,
        cpeFechaEmisionHasta: c.cpeFechaEmisionHasta,
    };
}

/**
 * Valores EXACTOS de `PagoEntity.MetodoPago` (microshopventas): el backend compara
 * `CAST(pg.metodoPago AS String) = :metodoPago`, así que el filtro y las etiquetas salen de aquí
 * y no del catálogo `METODO_PAGO` (CHEQUE/EFECTIVO/TRANSFERENCIA), que no coincide con el enum.
 */
export const METODOS_PAGO_PEDIDO: readonly { value: string; label: string }[] = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de débito' },
    { value: 'TRANSFERENCIA_BANCARIA', label: 'Transferencia bancaria' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'PAYPAL', label: 'PayPal' },
    { value: 'BILLETERA_DIGITAL', label: 'Billetera digital' },
];

/** Valores exactos de `PagoEntity.EstadoPago`. */
export const ESTADOS_PAGO_PEDIDO: readonly { value: string; label: string }[] = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'FALLIDO', label: 'Fallido' },
    { value: 'REEMBOLSADO', label: 'Reembolsado' },
];

/** Medios digitales cuyo cobro manual no se concilia sin N.º de operación (el backend da 400 sin él). */
const METODOS_CON_REFERENCIA_OBLIGATORIA: readonly string[] = ['TRANSFERENCIA_BANCARIA', 'YAPE', 'PLIN'];

export const REFERENCIA_PAGO_MAX = 100;

/**
 * Valida el N.º de operación al marcar pagado un pedido. Devuelve el mensaje de error o `null` si es válido.
 * Espeja `PedidoCommandService.registrarCobro`: obligatorio en transferencia/Yape/Plin, tope 100 caracteres.
 */
export function errorReferenciaPago(metodoPago: string | null | undefined, referencia: string): string | null {
    const ref = referencia.trim();
    if (ref.length > REFERENCIA_PAGO_MAX) return `Máximo ${REFERENCIA_PAGO_MAX} caracteres`;
    if (!ref && metodoPago && METODOS_CON_REFERENCIA_OBLIGATORIA.includes(metodoPago)) {
        return `Indique el N.º de operación (${etiquetaDe(METODOS_PAGO_PEDIDO, metodoPago)})`;
    }
    return null;
}

/** Acción de backoffice sobre un pedido; cada una es UN `PUT /api/pedidos/{id}/estado`. */
export type AccionPedido = 'ENVIAR' | 'MARCAR_PAGADO' | 'ENTREGAR' | 'CANCELAR' | 'RECHAZAR_ENTREGA' | 'REGISTRAR_COBRO';

/** Contra entrega = pago en EFECTIVO todavía PENDIENTE (espeja `PedidoCommandService.transicionPermitida`). */
export function esContraEntrega(metodoPago: string | null | undefined, estadoPago: string | null | undefined): boolean {
    return metodoPago === 'EFECTIVO' && estadoPago === 'PENDIENTE';
}

/**
 * Tabla estado → acciones del backoffice. Espeja las transiciones que el backend acepta:
 * ofrecer una que dé 409 es una promesa falsa y un estado sin salida deja pedidos colgados.
 *
 * - Contra entrega: PENDIENTE→ENVIADO sin cobrar; ENVIADO→CANCELADO («rechazado en entrega»);
 *   en ENTREGADO el cobro se registra después (ENTREGADO + PAGADO, el estado no cambia).
 * - Resto de métodos: PENDIENTE→PAGADO→ENVIADO→ENTREGADO, y cancelar antes de enviar.
 */
export function accionesDePedido(
    estado: string | null | undefined,
    metodoPago: string | null | undefined,
    estadoPago: string | null | undefined,
): AccionPedido[] {
    const contraEntrega = esContraEntrega(metodoPago, estadoPago);
    switch (estado) {
        case 'PENDIENTE': return contraEntrega ? ['ENVIAR', 'MARCAR_PAGADO', 'CANCELAR'] : ['MARCAR_PAGADO', 'CANCELAR'];
        case 'PAGADO': return ['ENVIAR', 'CANCELAR'];
        case 'ENVIADO': return contraEntrega ? ['ENTREGAR', 'RECHAZAR_ENTREGA'] : ['ENTREGAR'];
        case 'ENTREGADO': return contraEntrega ? ['REGISTRAR_COBRO'] : [];
        default: return [];
    }
}

/** Etiqueta en español de un código de enum; si es desconocido (o falta) devuelve el código / «—». */
export function etiquetaDe(
    catalogo: readonly { value: string; label: string }[],
    codigo: string | null | undefined,
): string {
    if (!codigo) return '—';
    return catalogo.find(o => o.value === codigo)?.label ?? codigo;
}

/** Cliente de un pedido: el pedido de invitado no tiene `usuarioId`, se muestra su correo. */
export function clienteDePedido(p: { usuarioId?: number | null; guestEmail?: string | null }): string {
    if (p.usuarioId != null) return `Usuario #${p.usuarioId}`;
    return p.guestEmail ? `${p.guestEmail} (invitado)` : 'Invitado';
}

/** «B001-00000012», o «Sin comprobante» si no se pidió tipo; «Boleta sin emitir» si el tipo se eligió al crear el pedido pero aún no hay serie-número. */
export function comprobanteDePedido(
    p: { cpeTipo?: string | null; cpeSerie?: string | null; cpeNumero?: string | null },
): string {
    if (p.cpeSerie && p.cpeNumero) return `${p.cpeSerie}-${p.cpeNumero}`;
    return p.cpeTipo ? `${etiquetaDe(TIPOS_CPE_PEDIDO, p.cpeTipo)} sin emitir` : 'Sin comprobante';
}

const TIPOS_CPE_PEDIDO: readonly { value: string; label: string }[] = [
    { value: 'BOLETA', label: 'Boleta' },
    { value: 'FACTURA', label: 'Factura' },
];

const ESTADOS_CPE: Readonly<Record<string, { label: string; badge: string }>> = {
    EMITIDO: { label: 'Emitido', badge: 'badge-success' },
    PENDIENTE: { label: 'Pendiente', badge: 'badge-warning' },
    ERROR: { label: 'Error SUNAT', badge: 'badge-error' },
};

/** Etiqueta y clase de badge del estado del CPE; `null` si el pedido no tiene comprobante. */
export function estadoCpeDePedido(estado: string | null | undefined): { label: string; badge: string } | null {
    return estado ? (ESTADOS_CPE[estado] ?? { label: estado, badge: 'badge-neutral' }) : null;
}
