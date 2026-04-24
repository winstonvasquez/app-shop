/**
 * SUNAT Constants — Perú
 *
 * Constantes tributarias y contables alineadas con normativa SUNAT
 * y PCGE 2020. Espejo de `IgvConstants.java` del backend.
 *
 * Referencias:
 * - IGV 18% desde 2011 (Ley 29666)
 * - ICBPER S/0.20 por bolsa (Ley 31277 vigente 2024+)
 * - PCGE 2020 — SMV-CONASEV 006-2008-EF/94.01 modificada
 */

/** Tasas tributarias vigentes (2026). */
export const SUNAT_RATES = {
  IGV: 0.18,
  IGV_FACTOR: 1.18,
  ICBPER_PER_BOLSA: 0.20,
  /** Retención general 3%. */
  RETENCION: 0.03,
  /** Detracción SPOT 10% (varía por bien/servicio, este es el más común). */
  DETRACCION_DEFAULT: 0.10,
} as const;

/** Códigos SUNAT — Tipos de Comprobante de Pago Electrónico (CPE). */
export const CPE_TIPO = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  GUIA_REMISION: '09',
  RECIBO_HONORARIOS: '02',
} as const;

export type CpeTipo = typeof CPE_TIPO[keyof typeof CPE_TIPO];

/** Series estándar de comprobantes (prefijo + 3 dígitos). */
export const CPE_SERIE = {
  FACTURA_DEFAULT: 'F001',
  BOLETA_DEFAULT: 'B001',
  NOTA_CREDITO_DEFAULT: 'FC01',
  NOTA_DEBITO_DEFAULT: 'FD01',
} as const;

/** Códigos SUNAT — Tipos de documento de identidad. */
export const DOCUMENTO_TIPO = {
  DNI: '01',
  CARNET_EXTRANJERIA: '04',
  PASAPORTE: '07',
  RUC: '06',
  CEDULA_DIPLOMATICA: '03',
  NO_DOMICILIADO_SIN_RUC: '00',
} as const;

export type DocumentoTipo = typeof DOCUMENTO_TIPO[keyof typeof DOCUMENTO_TIPO];

/** Cuentas PCGE 2020 más usadas en la operación (subset). */
export const PCGE_CUENTAS = {
  /** Caja. */
  CAJA: '1011',
  /** Cuentas corrientes — bancos. */
  BANCO: '1041',
  /** Mercaderías manufacturadas — existencia principal. */
  MERCADERIAS: '201',
  /** IGV — crédito fiscal. */
  IGV_CREDITO: '401114',
  /** IGV — débito fiscal. */
  IGV_DEBITO: '401111',
  /** Detracción SPOT — cuenta por pagar gobierno central. */
  DETRACCION_SPOT: '401121',
  /** Clientes — facturación. */
  CLIENTES: '121',
  /** Cuentas por cobrar diversas. */
  CXC_DIVERSAS: '162',
  /** Proveedores — facturas por pagar. */
  CXP_PROVEEDORES: '421111',
  /** Compras — mercaderías. */
  COMPRAS_MERCADERIAS: '601111',
  /** Ventas — mercaderías manufacturadas (M.I.). */
  VENTAS: '701',
  /** Tributos por pagar — SUNAT (retenciones). */
  TRIBUTOS_RETENCION: '401171',
} as const;

/** Libros electrónicos PLE (versión 5.1+). */
export const PLE_LIBROS = {
  REGISTRO_COMPRAS: '8',
  REGISTRO_VENTAS: '14',
  LIBRO_DIARIO: '5',
  LIBRO_MAYOR: '6',
  LIBRO_INVENTARIOS_BALANCES: '3',
} as const;

/** Moneda (ISO 4217). */
export const MONEDA = {
  PEN: 'PEN',
  USD: 'USD',
} as const;

export type Moneda = typeof MONEDA[keyof typeof MONEDA];

/** Formato display local. */
export const CURRENCY_DISPLAY = {
  SYMBOL_PEN: 'S/',
  SYMBOL_USD: '$',
  LOCALE: 'es-PE',
  DECIMALS: 2,
} as const;
