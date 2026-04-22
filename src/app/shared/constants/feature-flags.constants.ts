/**
 * Feature Flags — Módulos opcionales por tenant
 *
 * Se verifican via `authService.hasModule('NAME')`.
 * El backend emite estos flags en el JWT claim `modules: string[]`.
 *
 * Antes de agregar un nuevo flag: alinear con microshopusers
 * `CompanyEntity.modulosActivados` (JSON column).
 */

/** Módulos opcionales por empresa (tenant). */
export const MODULO_FLAG = {
  /** Sistema de cupones/promociones. */
  COUPONS: 'COUPONS',
  /** Crédito/financiamiento a cliente. */
  CREDIT: 'CREDIT',
  /** Seguir/favoritar tiendas. */
  STORE_FOLLOWS: 'STORE_FOLLOWS',
  /** Cambio rápido entre cuentas (multi-sucursal). */
  SWITCH_ACCOUNT: 'SWITCH_ACCOUNT',
  /** Programa de puntos de fidelidad. */
  LOYALTY: 'LOYALTY',
  /** Gift cards. */
  GIFT_CARDS: 'GIFT_CARDS',
  /** Flash sales / ventas relámpago. */
  FLASH_SALES: 'FLASH_SALES',
  /** Multicurrency (vender en USD). */
  MULTI_CURRENCY: 'MULTI_CURRENCY',
  /** Módulo logístico extendido (picking, tracking SUNAT GRE). */
  LOGISTICS_ADVANCED: 'LOGISTICS_ADVANCED',
  /** Chat soporte en tiempo real. */
  LIVE_CHAT: 'LIVE_CHAT',
} as const;

export type ModuloFlag = typeof MODULO_FLAG[keyof typeof MODULO_FLAG];

/** Roles del sistema (espejo backend RoleEnum). */
export const USER_ROLE = {
  /** Super admin MicroShop. */
  ADMIN: 'ADMIN',
  /** Dueño/gerente de empresa cliente. */
  OWNER: 'OWNER',
  /** Empleado administrativo (CRUD productos, pedidos, etc.). */
  EMPLOYEE: 'EMPLOYEE',
  /** Cajero POS. */
  CASHIER: 'CASHIER',
  /** Contador / usuario contabilidad. */
  ACCOUNTANT: 'ACCOUNTANT',
  /** Cliente final B2C/B2B. */
  CUSTOMER: 'CUSTOMER',
  /** Proveedor con acceso a portal compras. */
  SUPPLIER: 'SUPPLIER',
  /** Invitado sin sesión (compra anónima). */
  GUEST: 'GUEST',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

/** Roles con privilegio admin-level. */
export const ADMIN_ROLES: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.OWNER,
  USER_ROLE.EMPLOYEE,
] as const;

/** Roles con privilegio POS/caja. */
export const POS_ROLES: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.OWNER,
  USER_ROLE.CASHIER,
  USER_ROLE.EMPLOYEE,
] as const;
