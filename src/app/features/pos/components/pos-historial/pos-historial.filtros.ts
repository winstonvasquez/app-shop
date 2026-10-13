/** Filtros server-side del historial de ventas del turno — ver GET /api/pos/turno/{id}/historial. */
export interface PosHistorialFiltro {
    search?: string;
    estado?: string;
    metodoPago?: string;
    tipoCpe?: string;
    moneda?: string;
    sucursalId?: number;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

/**
 * Los ocho controles de filtro tal cual los devuelve el DOM: siempre cadenas, y `''` cuando el
 * usuario no eligió nada.
 */
export interface FiltrosHistorialCrudos {
    search: string;
    estado: string;
    metodoPago: string;
    tipoCpe: string;
    moneda: string;
    sucursalId: string;
    fechaDesde: string;
    fechaHasta: string;
}

/**
 * Traduce los controles del formulario al filtro que se emite al padre para recargar.
 *
 * Regla única: **la cadena vacía significa «no filtrar», y eso se dice con `undefined`**. El
 * historial NUNCA filtra en memoria la página ya cargada, así que un `''` enviado al backend
 * devolvería cero ventas en vez de todas. La sucursal viaja como número: el backend la declara
 * `Long`, y una cadena provoca 400.
 */
export function construirFiltroHistorial(crudos: FiltrosHistorialCrudos): PosHistorialFiltro {
    return {
        search: crudos.search || undefined,
        estado: crudos.estado || undefined,
        metodoPago: crudos.metodoPago || undefined,
        tipoCpe: crudos.tipoCpe || undefined,
        moneda: crudos.moneda || undefined,
        sucursalId: crudos.sucursalId ? Number(crudos.sucursalId) : undefined,
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
