/**
 * Order Status Constants — Espejo frontend de `EstadoPedido` (sealed interface)
 * del backend microshopventas/.../domain/valueobject/EstadoPedido.java
 *
 * Gotcha del proyecto: en backend se usa `instanceof` (sealed interface de
 * records), en frontend son strings — siempre comparar por string.
 */

/** Estados canónicos de pedido (string enum). */
export const ESTADO_PEDIDO = {
  PENDIENTE: 'PENDIENTE',
  PENDIENTE_PAGO: 'PENDIENTE_PAGO',
  PAGADO: 'PAGADO',
  CONFIRMADO: 'CONFIRMADO',
  PREPARANDO: 'PREPARANDO',
  ENVIADO: 'ENVIADO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
  DEVUELTO: 'DEVUELTO',
} as const;

export type EstadoPedido = typeof ESTADO_PEDIDO[keyof typeof ESTADO_PEDIDO];

/** Labels i18n-ready para UI. */
export const ESTADO_PEDIDO_LABELS: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'Preparando',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  DEVUELTO: 'Devuelto',
} as const;

/** Badge CSS classes (alineadas con DataTableComponent). */
export const ESTADO_PEDIDO_BADGE: Record<EstadoPedido, string> = {
  PENDIENTE: 'badge-warning',
  PENDIENTE_PAGO: 'badge-warning',
  PAGADO: 'badge-success',
  CONFIRMADO: 'badge-accent',
  PREPARANDO: 'badge-info',
  ENVIADO: 'badge-info',
  ENTREGADO: 'badge-success',
  CANCELADO: 'badge-error',
  DEVUELTO: 'badge-error',
} as const;

/** Estados de Orden de Compra (microshopcompras). */
export const ESTADO_ORDEN_COMPRA = {
  BORRADOR: 'BORRADOR',
  PENDIENTE: 'PENDIENTE',
  APROBADA: 'APROBADA',
  RECIBIDA: 'RECIBIDA',
  RECIBIDA_PARCIALMENTE: 'RECIBIDA_PARCIALMENTE',
  CANCELADA: 'CANCELADA',
} as const;

export type EstadoOrdenCompra = typeof ESTADO_ORDEN_COMPRA[keyof typeof ESTADO_ORDEN_COMPRA];

export const ESTADO_ORDEN_COMPRA_BADGE: Record<EstadoOrdenCompra, string> = {
  BORRADOR: 'badge-neutral',
  PENDIENTE: 'badge-warning',
  APROBADA: 'badge-success',
  RECIBIDA: 'badge-accent',
  RECIBIDA_PARCIALMENTE: 'badge-info',
  CANCELADA: 'badge-error',
} as const;

/** Estados CPE SUNAT. */
export const ESTADO_CPE = {
  PENDIENTE: 'PENDIENTE',
  EMITIDO: 'EMITIDO',
  ENVIADO: 'ENVIADO',
  ACEPTADO: 'ACEPTADO',
  RECHAZADO: 'RECHAZADO',
  ANULADO: 'ANULADO',
  ERROR: 'ERROR',
} as const;

export type EstadoCpe = typeof ESTADO_CPE[keyof typeof ESTADO_CPE];

/** Métodos de pago POS. */
export const METODO_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  YAPE: 'YAPE',
  PLIN: 'PLIN',
  TRANSFERENCIA: 'TRANSFERENCIA',
  GIFT_CARD: 'GIFT_CARD',
  CREDITO: 'CREDITO',
  MIXTO: 'MIXTO',
} as const;

export type MetodoPago = typeof METODO_PAGO[keyof typeof METODO_PAGO];
