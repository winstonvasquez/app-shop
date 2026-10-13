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
