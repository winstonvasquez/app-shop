// models/catalogo-pos.model.ts

export interface ProductoCatalogoPOS {
    varianteId: number;
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
