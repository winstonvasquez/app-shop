import { CategoryRequest, CategoryResponse } from '@core/models/category.model';

/** Valores crudos del formulario de categoría (`categoryForm.getRawValue()`). */
export interface CategoryFormRaw {
    nombre: string;
    descripcion?: string | null;
    imagenUrl?: string | null;
    nivel: number;
    padreId?: number | string | null;
}

/**
 * Traduce el formulario de categoría al DTO de microshopventas.
 * `padreId` sin elegir se omite, y el backend lo lee como «sin padre» (null u omitido quitan el padre):
 * todo PUT tiene que reenviar el padre actual o la categoría queda desprendida.
 */
export function construirCategoryRequest(v: CategoryFormRaw): CategoryRequest {
    return {
        nombre: v.nombre,
        descripcion: v.descripcion || '',
        imagenUrl: v.imagenUrl || undefined,
        nivel: v.nivel,
        padreId: v.padreId ? Number(v.padreId) : undefined,
    };
}

/** PUT que sólo cambia `activo`: reenvía el resto tal como lo muestra la fila. */
export function categoriaConActivo(row: CategoryResponse, activo: boolean): CategoryRequest {
    return {
        nombre: row.nombre,
        descripcion: row.descripcion || '',
        imagenUrl: row.imagenUrl || undefined,
        nivel: row.nivel,
        padreId: row.padreId ?? undefined,
        activo,
    };
}

/**
 * ¿Está activa la fila? El backend aún no devuelve `activo` en la lista: si no llega, se deduce del
 * filtro «Estado» (con `activo = No` todas las filas son inactivas; si no, la lista sólo trae activas).
 */
export function estaActivo(activo: boolean | undefined, filtroActivo: boolean | null): boolean {
    return activo ?? filtroActivo !== false;
}
