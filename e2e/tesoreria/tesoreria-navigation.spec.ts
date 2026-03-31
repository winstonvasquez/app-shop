/**
 * Spec de navegación del módulo Tesorería.
 * Verifica que las 4 rutas principales carguen sin errores de consola.
 *
 * Prerequisito: npm start debe estar corriendo en otra terminal
 * (o playwright.config.ts lo arranca automáticamente si no está).
 */
import { test, expect, Page } from '@playwright/test';

/* ── Fake JWT válido para auth guard ────────────────────────────
   loadUserFromStorage() usa atob(token.split('.')[1]) — necesita
   base64 estándar (con padding), NO base64url (sin +//).
   ──────────────────────────────────────────────────────────────── */
function makeFakeJwt(): string {
    const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'admin',
        userId: 1,
        companyId: 1,
        role: 'ADMIN',
        exp: 9999999999,
        modules: 'VENTAS,COMPRAS,LOGISTICA,CONTABILIDAD,RRHH'
    }));
    return `${header}.${payload}.fake-signature-for-testing`;
}

const FAKE_JWT = makeFakeJwt();

/* ── Mocks de API ───────────────────────────────────────────── */
const mockCajasPage = {
    content: [
        { id: 1, nombre: 'Caja Principal',  estado: 'ABIERTA', saldoActual: 5000.00, saldoInicial: 3000.00 },
        { id: 2, nombre: 'Caja Secundaria', estado: 'CERRADA', saldoActual: 0,       saldoInicial: 1000.00 },
    ],
    totalElements: 2, totalPages: 1, number: 0, size: 10
};

const mockPagosPage = {
    content: [],
    totalElements: 0, totalPages: 1, number: 0, size: 10
};

const mockMovimientosPage = {
    content: [],
    totalElements: 0, totalPages: 1, number: 0, size: 10
};

const mockCuentasPage = {
    content: [],
    totalElements: 0, totalPages: 1, number: 0, size: 10
};

/* ── Helper: auth + interceptors ────────────────────────────── */
async function setupMocks(page: Page): Promise<void> {
    await page.addInitScript((token: string) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_JWT);

    // Cajas
    await page.route('**/api/tesoreria/cajas**', route => {
        if (route.request().method() === 'GET') {
            route.fulfill({ json: mockCajasPage });
        } else {
            route.fulfill({ status: 201, json: { id: 99 } });
        }
    });

    // Pagos
    await page.route('**/api/tesoreria/pagos**', route => {
        if (route.request().method() === 'GET') {
            route.fulfill({ json: mockPagosPage });
        } else {
            route.fulfill({ status: 201, json: { id: 99 } });
        }
    });

    // Movimientos flujo-caja (más específico primero)
    await page.route('**/api/tesoreria/movimientos/flujo-caja**', route => {
        route.fulfill({ json: 1500.00 });
    });

    // Movimientos general
    await page.route('**/api/tesoreria/movimientos**', route => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({ json: mockMovimientosPage });
        } else {
            route.fulfill({ status: 201, json: { id: 99 } });
        }
    });

    // Cuentas bancarias
    await page.route('**/api/tesoreria/cuentas-bancarias**', route => {
        if (route.request().method() === 'GET') {
            route.fulfill({ json: mockCuentasPage });
        } else {
            route.fulfill({ status: 201, json: { id: 99 } });
        }
    });
}

/* ── Colector de errores de consola ─────────────────────────── */
function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    return errors;
}

/** Filtra ruido esperado en tests (MFE remotes no arrancados, backend no corre, etc.) */
const IGNORE_NOISE = [
    'favicon', 'ERR_ABORTED',
    'ERR_CONNECTION_REFUSED',
    'remoteEntry',
    'mfe-',
    'native-federation',
    'SystemParameterService',
    'the server responded with a status of',
];
function isAppError(msg: string): boolean {
    return !IGNORE_NOISE.some(pat => msg.includes(pat));
}

/* ══════════════════════════════════════════════════════════════
   SUITE 1: Tesorería / Cajas
   ══════════════════════════════════════════════════════════════ */
test.describe('Tesorería / Cajas', () => {
    test('navega sin errores de consola', async ({ page }) => {
        const errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cajas');
        await page.waitForURL('**/admin/tesoreria/cajas', { timeout: 30_000 });

        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 2: Tesorería / Pagos
   ══════════════════════════════════════════════════════════════ */
test.describe('Tesorería / Pagos', () => {
    test('navega sin errores de consola', async ({ page }) => {
        const errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/pagos');
        await page.waitForURL('**/admin/tesoreria/pagos', { timeout: 30_000 });

        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 3: Tesorería / Flujo de Caja
   ══════════════════════════════════════════════════════════════ */
test.describe('Tesorería / Flujo de Caja', () => {
    test('navega sin errores de consola', async ({ page }) => {
        const errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/flujo-caja');
        await page.waitForURL('**/admin/tesoreria/flujo-caja', { timeout: 30_000 });

        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 4: Tesorería / Cuentas Bancarias
   ══════════════════════════════════════════════════════════════ */
test.describe('Tesorería / Cuentas Bancarias', () => {
    test('navega sin errores de consola', async ({ page }) => {
        const errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cuentas-bancarias');
        await page.waitForURL('**/admin/tesoreria/cuentas-bancarias', { timeout: 30_000 });

        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });
});
