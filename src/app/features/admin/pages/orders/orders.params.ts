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
