/**
 * Shell entry — inicializa Native Federation y arranca la app.
 *
 * `ngDevMode` es una global que esbuild reemplaza en el código del shell, pero
 * NO en los chunks de `@angular/core` cargados dinámicamente vía Native
 * Federation. Sin este fallback, cualquier servicio que use `signal()` o
 * `effect()` lanza `ReferenceError: ngDevMode is not defined` al hidratarse
 * en producción.
 *
 * Definimos la global con fallback a `false` (modo prod) si nadie la setteó
 * antes. En dev (`npm start`) esbuild ya la sustituyó por `true` literal en
 * los chunks del shell — esta línea solo cubre los chunks federados.
 */
{
    const g = globalThis as Record<string, unknown>;
    if (typeof g['ngDevMode'] === 'undefined') {
        g['ngDevMode'] = false;
    }
}

/**
 * Selección de manifest de Native Federation:
 *
 * - DEV por default (host = localhost:4200, sin ?remotes=all): usa
 *   /remotes.manifest.dev.json (vacío). `npm start` levanta SOLO el shell;
 *   intentar resolver remoteEntry.json de los 6 MFEs caídos genera ruido
 *   rojo en consola y no aporta valor cuando se trabaja en storefront/auth/
 *   account/admin no-MFE.
 *
 * - DEV con `?remotes=all` en URL: fuerza el manifest completo. Útil cuando
 *   se levantó `npm run start:all` y se quiere navegar a rutas de MFE.
 *
 * - PROD (cualquier otro host/puerto): siempre usa /remotes.manifest.json.
 *   Un manifest fallido en prod es bug crítico — NO se silencia.
 *
 * Detección por `location.port === '4200'` en lugar de `ngDevMode`: esbuild
 * NO reemplaza `globalThis['ngDevMode']` (bracket access), solo identifiers
 * directos dentro de código Angular. Detectar por puerto es más fiable para
 * este setup específico (el shell solo escucha 4200 en dev).
 */
const __isDevShell = location.port === '4200';
const __wantRemotes = new URLSearchParams(location.search).get('remotes') === 'all';
const __manifestUrl = (__isDevShell && !__wantRemotes)
    ? '/remotes.manifest.dev.json'
    : '/remotes.manifest.json';

import('@angular-architects/native-federation').then(({ initFederation }) =>
    initFederation(__manifestUrl)
        .catch(err => console.error('[Shell] Federation init error:', err))
        .then(() => import('./bootstrap'))
        .catch(err => console.error('[Shell] Bootstrap error:', err))
);
