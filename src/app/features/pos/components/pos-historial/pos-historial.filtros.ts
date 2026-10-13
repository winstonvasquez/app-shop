/** Filtros server-side del historial de ventas del turno — ver GET /api/pos/turno/{id}/historial. */
export interface PosHistorialFiltro {
    search?: string;
    estado?: string;
    metodoPago?: string;
    tipoCpe?: string;
    moneda?: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

/**
 * Los siete controles de filtro tal cual los devuelve el DOM: siempre cadenas, y `''` cuando el
 * usuario no eligió nada.
 */
export interface FiltrosHistorialCrudos {
    search: string;
    estado: string;
    metodoPago: string;
    tipoCpe: string;
    moneda: string;
    fechaDesde: string;
    fechaHasta: string;
}

/**
 * Traduce los controles del formulario al filtro que se emite al padre para recargar.
 *
 * Regla única: **la cadena vacía significa «no filtrar», y eso se dice con `undefined`**. El
 * historial NUNCA filtra en memoria la página ya cargada, así que un `''` enviado al backend
 * devolvería cero ventas en vez de todas. No hay filtro de sucursal: un turno es de una sola
 * sucursal y `venta.sucursal_id` no se rellena (POSP-11).
 */
export function construirFiltroHistorial(crudos: FiltrosHistorialCrudos): PosHistorialFiltro {
    return {
        search: crudos.search || undefined,
        estado: crudos.estado || undefined,
        metodoPago: crudos.metodoPago || undefined,
        tipoCpe: crudos.tipoCpe || undefined,
        moneda: crudos.moneda || undefined,
        fechaCreacionDesde: crudos.fechaDesde || undefined,
        fechaCreacionHasta: crudos.fechaHasta || undefined,
    };
}

/**
 * Hay filtros activos si alguno sobrevive a la traducción de arriba. Se deriva de ella para que
 * el botón «Limpiar» no pueda desincronizarse de lo que de verdad se está filtrando.
 */
export function hayFiltrosHistorialActivos(crudos: FiltrosHistorialCrudos): boolean {
    return Object.values(construirFiltroHistorial(crudos)).some(v => v !== undefined);
}
