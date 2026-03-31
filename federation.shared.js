/**
 * Skip list compartido para todos los federation.config.js
 *
 * Los path aliases internos (@core/*, @shared/*, @features/*) son rutas
 * de TypeScript dentro del monolito — NO son paquetes npm compartibles.
 * Native Federation los detecta desde tsconfig.json y emite WARNs.
 * Añadirlos al skip los excluye del shared scope.
 */
const INTERNAL_ALIASES_SKIP = [
  // Aliases internos — no son paquetes, son paths del monolito
  '@core/auth',
  '@core/i18n',
  '@core/interceptors',
  '@core/models',
  '@core/services',
  '@shared/components',
  '@shared/constants',
  '@shared/services',
  '@shared/theme',
  '@shared/ui',
  '@features/admin',
  '@features/auth',
  '@features/cart',
  '@features/checkout',
  '@features/compras',
  '@features/contabilidad',
  '@features/finance',
  '@features/home',
  '@features/inventario',
  '@features/inventory',
  '@features/logistica',
  '@features/portal',
  '@features/pos',
  '@features/products',
  '@features/rrhh',
  '@features/tesoreria',
  // Paquetes sin metadatos de versión
  'crypto',
];

const BASE_SKIP = [
  'rxjs/ajax',
  'rxjs/fetch',
  'rxjs/testing',
  'rxjs/webSocket',
  ...INTERNAL_ALIASES_SKIP,
];

module.exports = { BASE_SKIP };
