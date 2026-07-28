import { Page, expect } from '@playwright/test';

/**
 * Autenticación REAL contra microshopusers (a diferencia de auth.helper.ts, que
 * inyecta un JWT falso en localStorage y solo sirve para probar el ruteo del front).
 *
 * El token que emite el backend es el único que pasa el filtro de Spring Security,
 * así que todas las pruebas que tocan datos (listados, CRUD, exportaciones) tienen
 * que usar este helper.
 */

export const SUPERADMIN = {
    username: process.env['E2E_USER'] ?? 'test.superadmin',
    password: process.env['E2E_PASSWORD'] ?? 'Test#2026!',
};

/** Clave de localStorage donde AuthService guarda el JWT (auth.service.ts). */
export const AUTH_TOKEN_KEY = 'auth_token';

/** Archivo donde el proyecto `setup` deja la sesión ya autenticada. */
export const STORAGE_STATE = 'e2e/.auth/superadmin.json';

/**
 * Inicia sesión por el formulario real de /auth/login y espera a que el router
 * abandone el área de autenticación.
 */
export async function loginReal(
    page: Page,
    credentials: { username: string; password: string } = SUPERADMIN,
): Promise<void> {
    await page.goto('/auth/login');

    await page.locator('input[formcontrolname="username"]').fill(credentials.username);
    await page.locator('input[formcontrolname="password"]').fill(credentials.password);
    await page.locator('#btn-login-submit button, #btn-login-submit').first().click();

    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 30_000 });
    await expect
        .poll(() => page.evaluate(key => localStorage.getItem(key), AUTH_TOKEN_KEY), { timeout: 15_000 })
        .not.toBeNull();
}

/** Payload del JWT emitido por el backend (sin validar la firma). */
export interface JwtPayload {
    sub: string;
    userId: number;
    companyId: number;
    roles: string[];
    modules: string;
    exp: number;
}

/** Decodifica el JWT guardado en localStorage; null si no hay sesión. */
export async function readJwt(page: Page): Promise<JwtPayload | null> {
    const token = await page.evaluate(key => localStorage.getItem(key), AUTH_TOKEN_KEY);
    if (!token) return null;
    const body = token.split('.')[1];
    if (!body) return null;
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayload;
}

/** Cierra la sesión borrando el token (útil para probar guards). */
export async function logout(page: Page): Promise<void> {
    await page.evaluate(key => localStorage.removeItem(key), AUTH_TOKEN_KEY);
}
