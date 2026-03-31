const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');
const { BASE_SKIP } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-rrhh',

  exposes: {
    './Routes': './projects/mfe-rrhh/src/app/rrhh.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
