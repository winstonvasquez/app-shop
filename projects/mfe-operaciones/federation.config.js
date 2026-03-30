const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');
const { BASE_SKIP } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-operaciones',

  exposes: {
    './ComprasRoutes':    './projects/mfe-operaciones/src/app/compras.routes.ts',
    './InventarioRoutes': './projects/mfe-operaciones/src/app/inventario.routes.ts',
    './LogisticaRoutes':  './projects/mfe-operaciones/src/app/logistica.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
