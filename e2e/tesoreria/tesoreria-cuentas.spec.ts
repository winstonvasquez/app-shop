/**
 * Spec detallado del módulo Tesorería — Cuentas Bancarias.
 * Prueba listado, badges, drawer crear con select de tipos, y acciones de editar/desactivar.
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
const mockCuentasPage = {
    content: [
        {
            id: 1,
            tenantId: 1,
            banco: 'BCP — Banco de Crédito del Perú',
            numeroCuenta: '194-12345678-0-01',
            tipoCuenta: 'CORRIENTE',
            moneda: 'PEN',
            saldoActual: 85420.50,
            estado: 'ACTIVA',
            cuentaInterbancaria: '002-194-000123456780-01',
            descripcion: 'Cuenta principal'
        },
        {
            id: 2,
            tenantId: 1,
            banco: 'Banco de la Nación',
            numeroCuenta: '00-123456789',
            tipoCuenta: 'DETRACCIONES',
            moneda: 'PEN',
            saldoActual: 8750.30,
            estado: 'ACTIVA',
            cuentaInterbancaria: null,
            descripcion: 'Detracciones'
        },
    ],
    totalElements: 2, totalPages: 1, number: 0, size: 10
};

/* ── Helper: auth + interceptors ────────────────────────────── */
async function setupMocks(page: Page): Promise<void> {
    await page.addInitScript((token: string) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_JWT);

    await page.route('**/api/tesoreria/cuentas-bancarias**', route => {
        const method = route.request().method();
        if (method === 'GET') {
            route.fulfill({ json: mockCuentasPage });
        } else if (method === 'POST') {
            route.fulfill({ status: 201, json: { id: 99, ...JSON.parse(route.request().postData() ?? '{}') } });
        } else if (method === 'PUT') {
            route.fulfill({ json: { ...mockCuentasPage.content[0] } });
        } else {
            route.fulfill({ status: 200, json: {} });
        }
    });

    // Otros endpoints tesorería para evitar errores de red
    await page.route('**/api/tesoreria/cajas**', route =>
        route.fulfill({ json: { content: [], totalElements: 0, totalPages: 1, number: 0, size: 10 } })
    );
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
   SUITE 1: Cuentas Bancarias — listado
   ══════════════════════════════════════════════════════════════ */
test.describe('Cuentas Bancarias — listado', () => {
    let errors: string[] = [];

    test.beforeEach(async ({ page }) => {
        errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cuentas-bancarias');
        await page.waitForURL('**/admin/tesoreria/cuentas-bancarias', { timeout: 30_000 });
    });

    test('carga sin errores y muestra data-table', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('muestra nombre del banco del mock', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('BCP — Banco de Crédito del Perú')).toBeVisible({ timeout: 20_000 });
    });

    test('badge CORRIENTE visible (accent)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-accent').first()).toBeVisible({ timeout: 20_000 });
    });

    test('badge DETRACCIONES visible (warning)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-warning').first()).toBeVisible({ timeout: 20_000 });
    });

    test('badge ACTIVA visible (success)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-success').first()).toBeVisible({ timeout: 20_000 });
    });

    test('3 KPI cards visibles', async ({ page }) => {
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const cards = page.locator('.page-container .card');
        await expect(cards.nth(2)).toBeVisible({ timeout: 20_000 });
        expect(await cards.count()).toBeGreaterThanOrEqual(3);
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 2: Cuentas Bancarias — drawer crear
   ══════════════════════════════════════════════════════════════ */
test.describe('Cuentas Bancarias — drawer crear', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cuentas-bancarias');
        await page.waitForURL('**/admin/tesoreria/cuentas-bancarias', { timeout: 30_000 });
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
    });

    test('botón + Nueva Cuenta abre drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Cuenta/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
    });

    test('botón Guardar Cuenta deshabilitado con formulario vacío', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Cuenta/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        // Intentar con Guardar Cuenta o Crear Cuenta
        const saveBtn = page.locator('.drawer-overlay').getByRole('button', {
            name: /Guardar Cuenta|Crear Cuenta/i
        });
        await expect(saveBtn).toBeDisabled({ timeout: 10_000 });
    });

    test('select Tipo de Cuenta tiene 4 opciones (CORRIENTE, AHORROS, CTS, DETRACCIONES)', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Cuenta/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        // Buscar el select de tipo de cuenta dentro del drawer
        const tipoSelect = page.locator('.drawer-overlay select').first();
        await expect(tipoSelect).toBeVisible({ timeout: 10_000 });

        const options = tipoSelect.locator('option');
        // Al menos 4 opciones con valores: CORRIENTE, AHORROS, CTS, DETRACCIONES
        // (puede haber una opción vacía/placeholder adicional)
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(4);

        // Verificar que las opciones clave existen
        await expect(tipoSelect.locator('option[value="CORRIENTE"]')).toHaveCount(1);
        await expect(tipoSelect.locator('option[value="AHORROS"]')).toHaveCount(1);
        await expect(tipoSelect.locator('option[value="CTS"]')).toHaveCount(1);
        await expect(tipoSelect.locator('option[value="DETRACCIONES"]')).toHaveCount(1);
    });

    test('botón Cancelar cierra el drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Cuenta/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /Cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 10_000 });
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 3: Cuentas Bancarias — acciones
   ══════════════════════════════════════════════════════════════ */
test.describe('Cuentas Bancarias — acciones', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/cuentas-bancarias');
        await page.waitForURL('**/admin/tesoreria/cuentas-bancarias', { timeout: 30_000 });
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.table-row').first()).toBeVisible({ timeout: 20_000 });
    });

    test('acción Editar siempre visible', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Editar/i }).first()).toBeVisible({ timeout: 15_000 });
    });

    test('acción Desactivar visible para cuentas ACTIVA', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Desactivar/i }).first()).toBeVisible({ timeout: 15_000 });
    });
});
