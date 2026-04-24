/**
 * Spec detallado del módulo Tesorería — Pagos.
 * Prueba listado, badges de estado, drawer crear y acciones de aprobación/pago.
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
const mockPagosPage = {
    content: [
        {
            id: 1,
            beneficiarioNombre: 'Proveedor ABC SAC',
            beneficiarioDocumento: '20123456789',
            concepto: 'Factura F001-1234',
            monto: 5500.00,
            tipoPago: 'PROVEEDOR',
            metodoPago: 'TRANSFERENCIA',
            estado: 'PENDING',
            fechaSolicitud: '2026-03-28',
            moneda: 'PEN'
        },
        {
            id: 2,
            beneficiarioNombre: 'Juan Pérez',
            beneficiarioDocumento: '12345678',
            concepto: 'Planilla Marzo',
            monto: 2800.00,
            tipoPago: 'NOMINA',
            metodoPago: 'TRANSFERENCIA',
            estado: 'APPROVED',
            fechaSolicitud: '2026-03-29',
            moneda: 'PEN'
        },
    ],
    totalElements: 2, totalPages: 1, number: 0, size: 10
};

/* ── Helper: auth + interceptors ────────────────────────────── */
async function setupMocks(page: Page): Promise<void> {
    await page.addInitScript((token: string) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_JWT);

    await page.route('**/api/tesoreria/pagos**', route => {
        const method = route.request().method();
        const url = route.request().url();

        if (method === 'GET') {
            route.fulfill({ json: mockPagosPage });
        } else if (/\/aprobar/.test(url)) {
            route.fulfill({ json: { ...mockPagosPage.content[0], estado: 'APPROVED' } });
        } else if (/\/rechazar/.test(url)) {
            route.fulfill({ status: 200, json: { ...mockPagosPage.content[0], estado: 'REJECTED' } });
        } else if (/\/pagar/.test(url)) {
            route.fulfill({ status: 200, json: { ...mockPagosPage.content[0], estado: 'PAID' } });
        } else if (method === 'POST') {
            route.fulfill({ status: 201, json: { id: 99, ...JSON.parse(route.request().postData() ?? '{}') } });
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
   SUITE 1: Pagos — listado
   ══════════════════════════════════════════════════════════════ */
test.describe('Pagos — listado', () => {
    let errors: string[] = [];

    test.beforeEach(async ({ page }) => {
        errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/tesoreria/pagos');
        await page.waitForURL('**/admin/tesoreria/pagos', { timeout: 30_000 });
    });

    test('carga sin errores y muestra tabla', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('muestra beneficiario del mock', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('Proveedor ABC SAC')).toBeVisible({ timeout: 20_000 });
    });

    test('badge PENDING visible (warning)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-warning').first()).toBeVisible({ timeout: 20_000 });
    });

    test('badge APPROVED visible (accent)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.badge-accent').first()).toBeVisible({ timeout: 20_000 });
    });

    test('4 KPI cards visibles', async ({ page }) => {
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
        const cards = page.locator('.page-container .card');
        await expect(cards.nth(3)).toBeVisible({ timeout: 20_000 });
        expect(await cards.count()).toBeGreaterThanOrEqual(4);
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 2: Pagos — drawer crear
   ══════════════════════════════════════════════════════════════ */
test.describe('Pagos — drawer crear', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/pagos');
        await page.waitForURL('**/admin/tesoreria/pagos', { timeout: 30_000 });
        await expect(page.locator('.page-container')).toBeVisible({ timeout: 20_000 });
    });

    test('botón + Nuevo Pago abre drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nuevo Pago/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
    });

    test('botón Registrar Pago deshabilitado con formulario vacío', async ({ page }) => {
        await page.getByRole('button', { name: /Nuevo Pago/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: /Registrar Pago/i })).toBeDisabled();
    });

    test('campo fecha usa app-date-picker', async ({ page }) => {
        await page.getByRole('button', { name: /Nuevo Pago/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('.drawer-overlay app-date-picker')).toBeVisible({ timeout: 10_000 });
    });

    test('botón Cancelar cierra drawer', async ({ page }) => {
        await page.getByRole('button', { name: /Nuevo Pago/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /Cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 10_000 });
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE 3: Pagos — acciones de estado
   ══════════════════════════════════════════════════════════════ */
test.describe('Pagos — acciones de estado', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/tesoreria/pagos');
        await page.waitForURL('**/admin/tesoreria/pagos', { timeout: 30_000 });
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
    });

    test('acción Aprobar visible para estado PENDING', async ({ page }) => {
        await expect(page.locator('.table-row').first()).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('button', { name: /Aprobar/i }).first()).toBeVisible({ timeout: 15_000 });
    });

    test('acción Pagar visible para estado APPROVED', async ({ page }) => {
        await expect(page.locator('.table-row').first()).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('button', { name: /Pagar/i }).first()).toBeVisible({ timeout: 15_000 });
    });
});
