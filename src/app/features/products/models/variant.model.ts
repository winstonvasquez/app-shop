export interface Variant {
    id: number;
    sku: string;
    nombre: string;
    precioAjuste: number;
    stockActual: number;
    atributos: { [key: string]: any };
}
