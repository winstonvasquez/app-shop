/**
 * Spec detallado del módulo Tesorería — Cajas.
 * Prueba listado, KPIs, badges, drawer crear y acciones abrir/cerrar.
 */
import { test, expect, Page } from '@playwright/test';

/* ── Fake JWT ────────────────────────────────────────────────── */
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

/* ── Helper: auth + interceptors ────────────────────────────── */
async function setupMocks(page: Page): Promise<void> {
    await page.addInitScript((token: string) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_JWT);

    await page.route('**/api/tesoreria/cajas**', route => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({ json: mockCajasPage });
        } else if (method === 'POST') {
            route.fulfill({ status: 201, json: { id: 99, nombre: 'Nueva Caja', estado: 'CERRADA', saldoActual: 0, saldoInicial: 0 } });
        } else if (method === 'PUT') {
            route.fulfill({ json: { ...mockCajasPage.content[0] } });
        } else {
            route.fulfill({ status: 204 });
        }
    });

    // Otros endpoints tesorería para evitar errores de red
    await page.route('**/api/tesoreria/movimientos/flujo-caja**', route =>
        route.fulfill({ json: 1500.00 })
    );
    await page.route('**/api/tesoreria/movimientos**', route => {
        if (route.request().method() === 'GET') {
            route.fulfill({ json: { content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 } });
        } else {
            route.fulfill({ status: 201, json: { id: 99 } });
        }
    });
    await page.route('**/api/tesoreria/pagos**', route =>
        route.fulfill({ json: { content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 } })
    );
    await page.route('**/api/tesoreria/cuentas-bancarias**', route =>
        route.fulfill({ json: { content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 } })
    );
}

/* ── Colector de errores de consola ─────────────────────────── */
function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    return errors;
}

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
   SUITE 1: Cajas — listado
   ══════════════════════════════════════════════════════════════ */
test.describe('Cajas — listado', () => {
    let errors: string[] = [];

    test.beforeEach(async ({ page }) => {
        errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cajas');
        await page.waitForURL('**/admin/tesoreria/cajas', { timeout: 30_000 });
    });

    test('carga sin errores y muestra data-table', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('badge ABIERTA visible con clase badge-success', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-success').first()).toBeVisible({ timeout: 20_000 });
    });

    test('badge CERRADA visible con clase badge-neutral', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-neutral').first()).toBeVisible({ timeout: 20_000 });
    });

    test('3 KPI cards visibles', async ({ page }) => {
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const cards = page.locator('.page-container .card');
        await expect(cards.nth(2)).toBeVisible({ timeout: 20_000 });
        expect(await cards.count()).toBeGreaterThanOrEqual(3);
    });

    test('paginador visible', async ({ page }) => {
        await expect(page.locator('.pg-bar')).toBeVisible({ timeout: 20_000 });
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 2: Cajas — drawer crear
   ══════════════════════════════════════════════════════════════ */
test.describe('Cajas — drawer crear', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cajas');
        await page.waitForURL('**/admin/tesoreria/cajas', { timeout: 30_000 });
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
    });

    test('botón + Nueva Caja abre drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Caja/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
    });

    test('botón Crear Caja deshabilitado con formulario vacío', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Caja/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        // Limpiar campo nombre si tiene valor previo
        const nombreInput = page.locator('.drawer-overlay input').first();
        await nombreInput.clear();

        await expect(page.getByRole('button', { name: /Crear Caja/i })).toBeDisabled();
    });

    test('botón Cancelar cierra el drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Caja/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        await page.getByRole('button', { name: /Cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 10_000 });
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 3: Cajas — drawer abrir/cerrar
   ══════════════════════════════════════════════════════════════ */
test.describe('Cajas — drawer abrir/cerrar', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cajas');
        await page.waitForURL('**/admin/tesoreria/cajas', { timeout: 30_000 });
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
    });

    test('acción Cerrar visible para caja ABIERTA', async ({ page }) => {
        // Esperar filas de la tabla
        await expect(page.locator('.table-row').first()).toBeVisible({ timeout: 20_000 });
        // El botón Cerrar corresponde a la caja ABIERTA (primera fila)
        await expect(page.getByRole('button', { name: /Cerrar/i }).first()).toBeVisible({ timeout: 15_000 });
    });

    test('acción Abrir visible para caja CERRADA', async ({ page }) => {
        await expect(page.locator('.table-row').first()).toBeVisible({ timeout: 20_000 });
        // El botón Abrir corresponde a la caja CERRADA (segunda fila)
        await expect(page.getByRole('button', { name: /Abrir/i }).first()).toBeVisible({ timeout: 15_000 });
    });
});
