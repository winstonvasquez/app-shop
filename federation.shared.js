/**
 * Shared federation config — paquetes explícitos en lugar de shareAll()
 *
 * shareAll() detecta y bundlea TODOS los sub-paquetes de node_modules
 * (84 paquetes incluyendo 27 de apexcharts y 25 de @angular/cdk),
 * consumiendo mucha memoria y tiempo. Solo necesitamos compartir los
 * paquetes que realmente cruzan boundaries entre shell y MFEs.
 */

const SHARED_CONFIG = { singleton: true, strictVersion: true, requiredVersion: 'auto' };

/**
 * Paquetes que deben compartirse entre shell y MFEs.
 * Solo los que se usan en ambos lados de la federación.
 */
const SHARED_PACKAGES = {
  '@angular/core':             SHARED_CONFIG,
  '@angular/core/rxjs-interop': SHARED_CONFIG,
  '@angular/core/primitives/signals': SHARED_CONFIG,
  '@angular/core/primitives/di':      SHARED_CONFIG,
  '@angular/common':           SHARED_CONFIG,
  '@angular/common/http':      SHARED_CONFIG,
  '@angular/compiler':         SHARED_CONFIG,
  '@angular/forms':            SHARED_CONFIG,
  '@angular/router':           SHARED_CONFIG,
  '@angular/animations':       SHARED_CONFIG,
  '@angular/animations/browser': SHARED_CONFIG,
  '@angular/platform-browser':   SHARED_CONFIG,
  '@angular/platform-browser/animations': SHARED_CONFIG,
  '@angular/cdk':              SHARED_CONFIG,
  'rxjs':                      SHARED_CONFIG,
  'rxjs/operators':            SHARED_CONFIG,
  '@ngx-translate/core':       SHARED_CONFIG,
  '@ngx-translate/http-loader': SHARED_CONFIG,
  'tslib':                     SHARED_CONFIG,
  'lucide-angular':            SHARED_CONFIG,
};

/**
 * Skip list — aliases internos del monolito + paquetes que no necesitan
 * compartirse (se bundlean localmente en cada MFE que los use).
 */
const INTERNAL_ALIASES_SKIP = [
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
  'crypto',
];

const BASE_SKIP = [
  'rxjs/ajax',
  'rxjs/fetch',
  'rxjs/testing',
  'rxjs/webSocket',
  ...INTERNAL_ALIASES_SKIP,
];

module.exports = { BASE_SKIP, SHARED_PACKAGES };
