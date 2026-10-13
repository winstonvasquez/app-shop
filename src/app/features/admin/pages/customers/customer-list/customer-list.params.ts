/** Filtros del toolbar de clientes tal como los guardan los signals de la pantalla. */
export interface FiltrosClienteCrudos {
    tipoCliente: string;
    condicionPago: string;
    tipoDocumento: string;
    segmentoId: string;
    activo: string;
    conCredito: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

/** Filtros normalizados para el endpoint de clientes (listado y exportación). */
export interface FiltrosCliente {
    tipoCliente?: string;
    condicionPago?: string;
    tipoDocumento?: string;
    segmentoId?: string;
    activo?: string;
    conCredito?: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
}

/**
 * Normaliza los filtros de clientes antes de mandarlos al backend.
 *
 * Regla de negocio: **un select en `''` significa «no filtrar»**, no «filtrar por vacío»; el
 * parámetro no debe viajar. Ojo con `activo` y `conCredito`: son booleanos que viajan como
 * TEXTO (`'true'`/`'false'`), así que el `'false'` es una elección legítima del usuario y NO
 * puede confundirse con «sin elegir» — por eso se compara contra la cadena vacía y no contra
 * la falsedad del booleano.
 *
 * El listado y la exportación server-side comparten esta función: el XLSX tiene que respetar
 * exactamente los mismos filtros que la tabla en pantalla.
 */
export function filtrosDeClientes(c: FiltrosClienteCrudos): FiltrosCliente {
    return {
        tipoCliente: c.tipoCliente || undefined,
        condicionPago: c.condicionPago || undefined,
        tipoDocumento: c.tipoDocumento || undefined,
        segmentoId: c.segmentoId || undefined,
        activo: c.activo || undefined,
        conCredito: c.conCredito || undefined,
        fechaCreacionDesde: c.fechaCreacionDesde,
        fechaCreacionHasta: c.fechaCreacionHasta,
    };
}
