import type { FacturaProveedorFiltros } from '@features/compras/services/factura-proveedor.service';

/** Los doce filtros del toolbar tal como los guardan los signals de la pantalla. */
export interface ValoresFiltroFactura {
    q: string;
    estado: string;
    tipoDocumento: string;
    resultadoMatch: string;
    estadoSunat: string;
    moneda: string;
    proveedorId: string;
    conDetraccion: string;
    fechaEmisionDesde: string | null;
    fechaEmisionHasta: string | null;
    fechaVencimientoDesde: string | null;
    fechaVencimientoHasta: string | null;
}

/**
 * Filtros del listado de facturas de proveedor.
 *
 * Existía DOS veces en el componente —una en `loadFacturas` y otra en el `params` de
 * `exportConfig`—, y las dos copias ya habían divergido: la del listado coaccionaba las cuatro
 * fechas con `||` y la de exportación con `??`. La diferencia importaba en un solo caso (una fecha
 * en cadena vacía viajaba en la exportación y no en el listado), así que la tabla y el archivo que
 * el usuario se descarga podían salir con filtros distintos.
 *
 * Se unifica hacia `||`, que es el criterio del listado: **un filtro en blanco es un filtro sin
 * elegir**. `toHttpParams` descarta igualmente la cadena vacía, así que la coacción es cinturón y
 * tirantes, pero se conserva para que la función sea correcta por sí misma y no dependa de quién
 * la consuma.
 */
export function construirFiltrosFactura(v: ValoresFiltroFactura): FacturaProveedorFiltros {
    return {
        q: v.q || undefined,
        estado: v.estado || undefined,
        tipoDocumento: v.tipoDocumento || undefined,
        resultadoMatch: v.resultadoMatch || undefined,
        estadoSunat: v.estadoSunat || undefined,
        moneda: v.moneda || undefined,
        proveedorId: v.proveedorId || undefined,
        conDetraccion: v.conDetraccion || undefined,
        fechaEmisionDesde: v.fechaEmisionDesde || undefined,
        fechaEmisionHasta: v.fechaEmisionHasta || undefined,
        fechaVencimientoDesde: v.fechaVencimientoDesde || undefined,
        fechaVencimientoHasta: v.fechaVencimientoHasta || undefined,
    };
}
