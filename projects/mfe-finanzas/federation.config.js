const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-finanzas',

  exposes: {
    // Dominio Finanzas expone dos módulos de rutas independientes
    './ContabilidadRoutes': './projects/mfe-finanzas/src/app/contabilidad.routes.ts',
    './TesoreriaRoutes':    './projects/mfe-finanzas/src/app/tesoreria.routes.ts',
  },

  shared: {
    ...SHARED_PACKAGES,
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
