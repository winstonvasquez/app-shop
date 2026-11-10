/**
 * El catálogo TIPO_COMPROBANTE usa códigos de texto (FACTURA, BOLETA…) pero los registros de compras
 * y ventas guardan el código del catálogo 01 de SUNAT. Sin traducir, el filtro siempre daba 0 filas.
 */
const CODIGO_SUNAT: Record<string, string> = {
    FACTURA: '01', RECIBO_HONORARIOS: '02', BOLETA: '03', LIQUIDACION_COMPRA: '04',
    NOTA_CREDITO: '07', NOTA_DEBITO: '08', GUIA_REMISION: '09', TICKET: '12', GUIA_TRANSPORTISTA: '31',
};

export function codigoSunatDeComprobante(codigoCatalogo: string): string {
    return CODIGO_SUNAT[codigoCatalogo] ?? codigoCatalogo;
}
