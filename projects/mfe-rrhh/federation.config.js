const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-rrhh',

  exposes: {
    './Routes': './projects/mfe-rrhh/src/app/rrhh.routes.ts',
  },

  shared: {
    ...SHARED_PACKAGES,
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
