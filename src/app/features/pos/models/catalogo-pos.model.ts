// models/catalogo-pos.model.ts

export interface ProductoCatalogoPOS {
    varianteId: number;
    /** Producto padre de la variante. Lo trae el backend desde 2026-08-02 para resolver la
     *  etiqueta de promociones de alcance PRODUCTO; el POS no lo usa para nada más. */
    productoId?: number;
    sku: string;
    nombre: string;
    nombreProducto: string;
    categoriaId: string;
    categoria: string;
    precioBase: number;
    precioAjuste: number;
    precioFinal: number;
    stockActual: number;
    stockMinimo: number;
    imagenUrl?: string;
    atributos?: Record<string, unknown>;
    unidadMedida?: string; // UND, KG, LB, LT, MT
    /** Etiqueta de promoción activa, ej. "-20%". Null si no hay ninguna vigente. Cubre los alcances
     *  PRODUCTO y CATEGORIA; el primero gana al segundo por ser el vínculo más específico. */
    promocionEtiqueta?: string | null;
}

export type DescuentoTipo = 'NINGUNO' | 'PORCENTAJE' | 'MONTO';

// UI-side cart item extending catalog info
export interface CartItem {
    variante: ProductoCatalogoPOS;
    cantidad: number;
    subtotal: number;
    descuentoTipo: DescuentoTipo;
    descuentoValor: number;
    descuentoMonto: number;
    autorizadoPor: number | null;
    bolsas: number;
}
