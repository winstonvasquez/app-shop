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
}

// UI-side cart item extending catalog info
export interface CartItem {
    variante: ProductoCatalogoPOS;
    cantidad: number;
    subtotal: number;
}
