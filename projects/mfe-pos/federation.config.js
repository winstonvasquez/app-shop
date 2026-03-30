const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');
const { BASE_SKIP } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-pos',

  exposes: {
    // El shell carga este módulo de rutas dinámicamente
    './Routes': './projects/mfe-pos/src/app/pos.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
