/**
 * Regex Patterns — Perú
 *
 * Expresiones regulares validadas para documentos y contactos peruanos.
 * Centralizadas para reusar en Validators.pattern() y manual validations.
 */

/** Documentos de identidad peruanos. */
export const DOC_REGEX = {
  /** DNI — 8 dígitos. */
  DNI: /^\d{8}$/,
  /** Carnet de Extranjería — 9 dígitos. */
  CARNET_EXTRANJERIA: /^\d{9}$/,
  /** Pasaporte — alfanumérico 9-12 chars. */
  PASAPORTE: /^[A-Z0-9]{9,12}$/i,
  /** RUC — 11 dígitos, inicia con 10 (PN), 15, 17 (s.sucesión), 20 (PJ). */
  RUC: /^(10|15|17|20)\d{9}$/,
} as const;

/** Contactos. */
export const CONTACT_REGEX = {
  /** Email RFC 5322 simplificado. */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Teléfono Perú fijo: 01 (Lima) o 0XX 9 dígitos. Formato flexible. */
  TELEFONO_PE: /^\+?51?[\s-]?(?:\d{1,2}[\s-]?\d{6,7}|\d{9})$/,
  /** Celular Perú: 9XXXXXXXX. */
  CELULAR_PE: /^9\d{8}$/,
} as const;

/** Patrones de datos contables/fiscales. */
export const FISCAL_REGEX = {
  /** Serie CPE: 1 letra + 3 dígitos (B001, F001, FC01). */
  CPE_SERIE: /^[A-Z]{1,2}\d{2,3}$/,
  /** Número correlativo CPE: 1-8 dígitos. */
  CPE_NUMERO: /^\d{1,8}$/,
  /** Código cuenta contable PCGE: 3-8 dígitos. */
  CUENTA_CONTABLE: /^\d{3,8}$/,
  /** Código SKU: alfanumérico + guiones. */
  SKU: /^[A-Z0-9-]{3,40}$/i,
} as const;

/** Utilidades de formato. */
export const FORMAT_REGEX = {
  /** Solo números. */
  NUMERIC: /^\d+$/,
  /** Decimal positivo con hasta 2 decimales. */
  DECIMAL_2: /^\d+(\.\d{1,2})?$/,
  /** URL http/https. */
  URL: /^https?:\/\/[^\s]+$/i,
  /** Slug/kebab-case. */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;
