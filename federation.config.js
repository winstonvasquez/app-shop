const { withNativeFederation } = require('@angular-architects/native-federation/config');
const { BASE_SKIP, SHARED_PACKAGES } = require('./federation.shared');

module.exports = withNativeFederation({
  name: 'app-shop',

  // El shell carga los remotes dinámicamente desde public/remotes.manifest.json
  // No se declaran aquí — se usan loadRemoteModule() + initFederation() en main.ts

  shared: SHARED_PACKAGES,

  skip: BASE_SKIP,

  features: {
    ignoreUnusedDeps: true
  }
});
