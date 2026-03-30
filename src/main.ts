import { initFederation } from '@angular-architects/native-federation';

/**
 * Shell — inicializa Native Federation cargando el manifest dinámico.
 * En desarrollo: /remotes.manifest.json (public/)
 * En producción: URL configurable por entorno (CDN)
 */
initFederation('/remotes.manifest.json')
    .catch(err => console.error('[Shell] Federation init error:', err))
    .then(() => import('./bootstrap'))
    .catch(err => console.error('[Shell] Bootstrap error:', err));
