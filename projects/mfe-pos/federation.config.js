const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-pos',

  exposes: {
    // El shell carga este módulo de rutas dinámicamente
    './Routes': './projects/mfe-pos/src/app/pos.routes.ts',
  },

  shared: {
    ...SHARED_PACKAGES,
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
