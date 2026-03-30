const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');
const { BASE_SKIP } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-platform',

  exposes: {
    './PortalRoutes': './projects/mfe-platform/src/app/portal.routes.ts',
    './AdminRoutes':  './projects/mfe-platform/src/app/admin.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
