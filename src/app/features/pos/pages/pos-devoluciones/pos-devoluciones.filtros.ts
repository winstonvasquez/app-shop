import { PosDevolucionFiltros } from '../../services/pos-venta.service';

/**
 * Los ocho controles de filtro del listado tal cual los devuelve el DOM: siempre cadenas,
 * y siempre `''` cuando el usuario no eligió nada (incluidos los `<input type="date">`).
 */
export interface FiltrosDevolucionCrudos {
    search: string;
    motivo: string;
    estado: string;
    cajeroId: string;
    fechaDevDesde: string;
    fechaDevHasta: string;
    fechaVentaDesde: string;
    fechaVentaHasta: string;
}

/**
 * Traduce los controles del formulario a los filtros de `GET /api/pos/devoluciones`.
 *
 * Regla única: **la cadena vacía significa «no filtrar», y eso se dice con `undefined`**, no
 * con `''`. Enviar `''` filtraría por cadena vacía y dejaría el listado siempre en blanco.
 * El id de cajero, además, viaja como número porque el backend lo declara `Long`.
 */
export function construirFiltrosDevolucion(crudos: FiltrosDevolucionCrudos): PosDevolucionFiltros {
    return {
        search: crudos.search || undefined,
        motivo: crudos.motivo || undefined,
        estado: crudos.estado || undefined,
        cajeroId: crudos.cajeroId ? Number(crudos.cajeroId) : undefined,
        fechaDevolucionDesde: crudos.fechaDevDesde || undefined,
        fechaDevolucionHasta: crudos.fechaDevHasta || undefined,
        fechaCreacionDesde: crudos.fechaVentaDesde || undefined,
        fechaCreacionHasta: crudos.fechaVentaHasta || undefined,
    };
}

/**
 * Hay filtros activos si alguno sobrevive a la traducción de arriba. Se deriva de ella a
 * propósito: si un día se añade un filtro nuevo, el botón «Limpiar» aparece solo y no puede
 * quedarse desincronizado de lo que realmente se está enviando al backend.
 */
export function hayFiltrosDevolucionActivos(crudos: FiltrosDevolucionCrudos): boolean {
    return Object.values(construirFiltrosDevolucion(crudos)).some(v => v !== undefined);
}
