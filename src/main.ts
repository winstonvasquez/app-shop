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
 * En dev (ngDevMode=true), si el manifest principal falla por MFEs caídos
 * (típico en `npm start` solo-shell), reintentamos con manifest vacío para
 * que el importmap `shared` igual se construya y los chunks Angular puedan
 * resolverse. En prod NO silenciamos: un manifest fallido es bug crítico.
 */
const __isDev = (globalThis as Record<string, unknown>)['ngDevMode'] === true;

import('@angular-architects/native-federation').then(({ initFederation }) =>
    initFederation('/remotes.manifest.json')
        .catch(err => {
            if (__isDev) {
                console.warn('[Shell] Federation init falló (MFEs caídos en dev) — fallback a manifest vacío');
                return initFederation('/remotes.manifest.dev.json');
            }
            console.error('[Shell] Federation init error:', err);
            throw err;
        })
        .then(() => import('./bootstrap'))
        .catch(err => console.error('[Shell] Bootstrap error:', err))
);
