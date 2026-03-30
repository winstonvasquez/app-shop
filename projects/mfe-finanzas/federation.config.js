const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');
const { BASE_SKIP } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-finanzas',

  exposes: {
    // Dominio Finanzas expone dos módulos de rutas independientes
    './ContabilidadRoutes': './projects/mfe-finanzas/src/app/contabilidad.routes.ts',
    './TesoreriaRoutes':    './projects/mfe-finanzas/src/app/tesoreria.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
