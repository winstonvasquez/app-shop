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

import('@angular-architects/native-federation').then(({ initFederation }) =>
    initFederation('/remotes.manifest.json')
        .catch(err => console.error('[Shell] Federation init error:', err))
        .then(() => import('./bootstrap'))
        .catch(err => console.error('[Shell] Bootstrap error:', err))
);
