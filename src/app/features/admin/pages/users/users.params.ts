import { UserFilter } from '@features/admin/models/user.model';

/** Filtros del toolbar de usuarios tal como los guardan los signals de la pantalla. */
export interface FiltrosUsuarioCrudos {
    search: string;
    rolId: string;
    activo: string;
    tipoDocumento: string;
    fechaCreacionDesde: string | null;
    fechaCreacionHasta: string | null;
}

/**
 * Normaliza los filtros de usuarios a los tipos que espera microshopusers.
 *
 * Reglas de negocio que codifica:
 * - **Un select en `''` significa «no filtrar»** y el parámetro no viaja.
 * - **`rolId` y `activo` cambian de tipo**: la UI los guarda como texto (los `<select>` sólo dan
 *   cadenas) y el backend los recibe como número y booleano. `'false'` es una elección legítima
 *   («ver sólo los dados de baja») y NO puede confundirse con «sin elegir», por eso primero se
 *   comprueba que la cadena no esté vacía y sólo después se compara con `'true'`.
 * - Los extremos de fecha se guardan como `null` en la pantalla y se envían `undefined`, que es
 *   lo que el constructor de parámetros HTTP omite.
 */
export function filtroDeUsuarios(c: FiltrosUsuarioCrudos): UserFilter {
    return {
        search: c.search || undefined,
        rolId: c.rolId ? Number(c.rolId) : undefined,
        activo: c.activo ? c.activo === 'true' : undefined,
        tipoDocumento: c.tipoDocumento || undefined,
        fechaCreacionDesde: c.fechaCreacionDesde ?? undefined,
        fechaCreacionHasta: c.fechaCreacionHasta ?? undefined,
    };
}
