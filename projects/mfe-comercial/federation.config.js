const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('../../federation.shared');

module.exports = withNativeFederation({
  name: 'mfe-comercial',

  exposes: {
    // Dominio Comercial — storefront completo
    './StorefrontRoutes': './projects/mfe-comercial/src/app/storefront.routes.ts',
  },

  shared: {
    ...SHARED_PACKAGES,
  },

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
