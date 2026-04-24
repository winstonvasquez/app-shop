const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-platform',

  exposes: {
    './PortalRoutes': './projects/mfe-platform/src/app/portal.routes.ts',
    './AdminRoutes':  './projects/mfe-platform/src/app/admin.routes.ts',
  },

  shared: {
    ...SHARED_PACKAGES,
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
