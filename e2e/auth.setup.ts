import { test as setup, expect } from '@playwright/test';
import { loginReal, readJwt, STORAGE_STATE } from './helpers/real-auth.helper';

/**
 * Proyecto `setup` de Playwright: inicia sesión UNA vez con el superadmin real y
 * guarda el estado (localStorage con el JWT del backend) en STORAGE_STATE.
 * El resto de proyectos lo reutiliza, así que ningún spec vuelve a pasar por el
 * formulario de login.
 */
setup('autenticar superadmin contra el backend real', async ({ page }) => {
    await loginReal(page);

    const jwt = await readJwt(page);
    expect(jwt, 'el backend debe emitir un JWT decodificable').not.toBeNull();
    expect(jwt!.sub).toBe('test.superadmin');
    expect(jwt!.roles).toContain('ROLE_SUPERADMIN');
    expect(jwt!.companyId, 'la sesión debe traer empresa activa').toBeGreaterThan(0);
    expect(jwt!.modules, 'el superadmin debe tener módulos habilitados').toBeTruthy();

    await page.context().storageState({ path: STORAGE_STATE });
});
