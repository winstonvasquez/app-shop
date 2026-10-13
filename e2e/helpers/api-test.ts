import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { AUTH_TOKEN_KEY, STORAGE_STATE } from './real-auth.helper';

interface EstadoGuardado {
    origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
}

/**
 * `test` cuyo `request` va autenticado como el superadmin de la sesión del setup.
 *
 * El `request` de Playwright sólo hereda las COOKIES del storageState, y el token vive en
 * localStorage (`auth_token`): las specs que preparaban datos por API viajaban anónimas y el
 * backend respondía 403. Se lee al crear el contexto, no al cargar el módulo, para usar el token
 * que el setup acaba de emitir y no el de la ejecución anterior.
 */
export const test = base.extend({
    request: async ({ playwright, baseURL }, use) => {
        const estado = JSON.parse(readFileSync(STORAGE_STATE, 'utf-8')) as EstadoGuardado;
        const token = estado.origins.flatMap(o => o.localStorage).find(i => i.name === AUTH_TOKEN_KEY)?.value;
        const ctx = await playwright.request.newContext({
            baseURL,
            extraHTTPHeaders: { 'X-Tenant-ID': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        await use(ctx);
        await ctx.dispose();
    },
});

export { expect };
