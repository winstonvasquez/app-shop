import { ProductRequest } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';

/** Valores crudos del formulario de producto (`productForm.value`). */
export interface ProductFormRaw {
    nombre: string;
    descripcion?: string | null;
    precioBase: number;
    marca?: string | null;
    categoriaIds?: number[] | null;
}

/**
 * Traduce el formulario de producto al DTO de microshopventas.
 *
 * Reglas de negocio que codifica:
 * - **El texto vacío es «sin dato»**: descripción y marca viajan `null` para borrar el valor
 *   anterior en vez de guardar `''`.
 * - **`categoriaIds` ausente NO es lo mismo que lista vacía**: el backend interpreta `[]` como
 *   «quítale todas las categorías». Mientras no sepamos cuáles son las categorías reales del
 *   producto en edición (`categoriasCargadas === false`) el campo se OMITE, o el guardado
 *   borraría las que tuviera.
 */
export function construirProductRequest(
    v: ProductFormRaw,
    companyId: number,
    categoriasCargadas: boolean,
): ProductRequest {
    return {
        nombre: v.nombre,
        descripcion: v.descripcion || null,
        precioBase: v.precioBase,
        marca: v.marca || null,
        companyId,
        categoriaIds: categoriasCargadas ? (v.categoriaIds || []) : undefined,
    };
}

/**
 * PUT que sólo cambia `activo`, a partir del producto COMPLETO (`getById`). `categoriaIds` se omite
 * a propósito: ausente = «no toques las categorías» (la lista vacía las borraría).
 */
export function productoConActivo(p: ProductResponse, companyId: number, activo: boolean): ProductRequest {
    return {
        nombre: p.nombre,
        descripcion: p.descripcion || null,
        precioBase: p.precioBase,
        marca: p.marca || null,
        companyId,
        activo,
    };
}
