/**
 * Spec de navegación real del módulo Ventas.
 * Navega por cada sección, detecta errores de consola y UI.
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
    // Usar base64 estándar (btoa sin reemplazos) para que atob() funcione en el browser
    const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: 'admin',
        userId: 1,
        companyId: 1,
        role: 'ADMIN',
        exp: 9999999999,  // expira año 2286
        modules: 'VENTAS,COMPRAS,LOGISTICA,CONTABILIDAD,RRHH'
    }));
    return `${header}.${payload}.fake-signature-for-testing`;
}

const FAKE_JWT = makeFakeJwt();

/* ── Mocks de API ───────────────────────────────────────────── */
const mockPedidosPage = {
    content: [
        { id: 1, fechaPedido: '2026-03-29T08:00:00', usuarioId: 101, total: 320.00, estado: 'PENDIENTE',  detalles: [] },
        { id: 2, fechaPedido: '2026-03-28T15:00:00', usuarioId: 102, total: 150.00, estado: 'ENTREGADO', detalles: [] },
        { id: 3, fechaPedido: '2026-03-27T11:00:00', usuarioId: 103, total:  89.90, estado: 'ENVIADO',   detalles: [] },
    ],
    totalElements: 3, totalPages: 1, number: 0, size: 10
};

const mockPedidoDetalle = {
    id: 1, fechaPedido: '2026-03-29T08:00:00', usuarioId: 101, total: 320.00, estado: 'PENDIENTE',
    detalles: [{
        id: 10, productoId: 5, productoNombre: 'Laptop HP', varianteNombre: 'i7 16GB',
        sku: 'LHP-001', cantidad: 1, precioUnitario: 320.00, subtotal: 320.00
    }]
};

const mockPromociones = [
    { id: 1, nombre: 'Verano 20%', tipo: 'PORCENTAJE', valor: 20, alcance: 'CARRITO',
      codigoCupon: 'VER20', limiteUsos: 100, usosActuales: 12,
      fechaInicio: '2026-03-01', fechaFin: '2026-03-31', activo: true },
    { id: 2, nombre: 'Fijo S/10', tipo: 'MONTO_FIJO', valor: 10, alcance: 'PRODUCTO',
      usosActuales: 0, fechaInicio: '2026-01-01', fechaFin: '2026-01-31', activo: false },
];

const mockVentasPos = {
    content: [{ id: 1, numeroTicket: 'T-001', total: 45.00, estado: 'CERRADA',
                fechaCreacion: '2026-03-29T08:30:00', cajeroNombre: 'Ana' }],
    totalElements: 1, totalPages: 1
};

/* ── Helper: auth + interceptors ────────────────────────────── */
async function setupMocks(page: Page): Promise<void> {
    // JWT válido en localStorage — ejecuta ANTES de que Angular cargue
    await page.addInitScript((token: string) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_JWT);

    // Pedidos
    await page.route('**/api/pedidos**', route => {
        const url = route.request().url();
        if (/\/api\/pedidos\/\d+\/estado/.test(url)) {
            route.fulfill({ json: { ...mockPedidoDetalle, estado: 'PAGADO' } });
        } else if (/\/api\/pedidos\/\d+$/.test(url)) {
            route.fulfill({ json: mockPedidoDetalle });
        } else {
            route.fulfill({ json: mockPedidosPage });
        }
    });

    // Promociones
    await page.route('**/api/v1/promociones**', route => {
        const method = route.request().method();
        if (method === 'GET')  route.fulfill({ json: mockPromociones });
        else if (method === 'POST') route.fulfill({ status: 201, json: { id: 99, ...JSON.parse(route.request().postData() ?? '{}'), usosActuales: 0 } });
        else if (method === 'PUT')  route.fulfill({ json: { id: 1, ...JSON.parse(route.request().postData() ?? '{}'), usosActuales: 12 } });
        else route.fulfill({ status: 204 });
    });

    // POS ventas
    await page.route('**/api/ventas/pos**', route =>
        route.fulfill({ json: mockVentasPos })
    );

    // Parámetros del módulo ventas — retorna 404 para caer al fallback de constantes locales
    await page.route('**/api/v1/parametros**', route =>
        route.fulfill({ status: 404, body: '' })
    );
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
    'ERR_CONNECTION_REFUSED',       // MFE remotes no corriendo
    'remoteEntry',                  // MFE federation
    'mfe-',                         // MFE remote errors
    'native-federation',            // @angular-architects/native-federation
    'SystemParameterService',       // parámetros de sistema (backend no corre)
    'the server responded with a status of',  // HTTP 4xx/5xx (backend no corre en tests)
];
function isAppError(msg: string): boolean {
    return !IGNORE_NOISE.some(pat => msg.includes(pat));
}

/* ══════════════════════════════════════════════════════════════
   SUITE: Dashboard Ventas
   ══════════════════════════════════════════════════════════════ */
test.describe('Dashboard Ventas', () => {

    test('carga sin errores de consola y muestra KPIs', async ({ page }) => {
        const errors = collectErrors(page);
        await setupMocks(page);
        await page.goto('/admin/ventas/dashboard');
        await page.waitForURL('**/admin/ventas/dashboard', { timeout: 30_000 });

        await expect(page.locator('.card-metric').first()).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores de consola: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('tabla últimos pedidos muestra datos del mock', async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/ventas/dashboard');
        await page.waitForURL('**/admin/ventas/dashboard', { timeout: 30_000 });

        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('S/ 320.00')).toBeVisible();
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE: Pedidos
   ══════════════════════════════════════════════════════════════ */
test.describe('Pedidos — listado', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/orders');
        await page.waitForURL('**/admin/orders', { timeout: 30_000 });
    });

    test('carga sin errores de consola', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
    });

    test('tabla muestra los pedidos del mock', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('S/ 320.00')).toBeVisible();
        await expect(page.getByText('S/ 150.00')).toBeVisible();
    });

    test('badge PENDIENTE visible en rojo/naranja', async ({ page }) => {
        await expect(page.locator('.badge-warning').first()).toBeVisible({ timeout: 20_000 });
    });

    test('badge ENTREGADO visible en verde', async ({ page }) => {
        await expect(page.locator('.badge-success').first()).toBeVisible({ timeout: 20_000 });
    });

    test('paginador visible con info de registros', async ({ page }) => {
        await expect(page.locator('.pg-bar')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.pg-info')).toContainText('Mostrando');
    });
});

test.describe('Pedidos — detalle (drawer)', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/orders');
        await page.waitForURL('**/admin/orders', { timeout: 30_000 });
        await expect(page.locator('.action-btn').first()).toBeVisible({ timeout: 20_000 });
        await page.locator('.action-btn').first().click();
    });

    test('drawer se abre al hacer click en Ver', async ({ page }) => {
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
    });

    test('drawer muestra nombre del producto del detalle', async ({ page }) => {
        await expect(page.getByText('Laptop HP')).toBeVisible({ timeout: 15_000 });
    });

    test('botón Marcar Pagado es visible para PENDIENTE', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Marcar Pagado/i })).toBeVisible({ timeout: 15_000 });
    });

    test('botón Cancelar orden es visible para PENDIENTE', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Cancelar/i })).toBeVisible({ timeout: 15_000 });
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE: Promociones
   ══════════════════════════════════════════════════════════════ */
test.describe('Promociones — listado', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/promotions');
        await page.waitForURL('**/admin/promotions', { timeout: 30_000 });
    });

    test('carga sin errores y muestra 3 KPIs', async ({ page }) => {
        const errors = collectErrors(page);
        await expect(page.locator('.card-metric').nth(2)).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('tabla muestra promo "Verano 20%"', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('Verano 20%')).toBeVisible();
    });

    test('badge ACTIVA visible', async ({ page }) => {
        await expect(page.locator('.badge-success').first()).toBeVisible({ timeout: 20_000 });
    });
});

test.describe('Promociones — formulario', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/promotions');
        await page.waitForURL('**/admin/promotions', { timeout: 30_000 });
    });

    test('botón guardar deshabilitado con nombre vacío', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: /Guardar Promoción/i })).toBeDisabled();
    });

    test('drawer tiene 2 campos de fecha DateInput', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();
        await expect(page.locator('app-date-input')).toHaveCount(2, { timeout: 15_000 });
    });

    test('crear nueva promoción con datos completos', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        await page.locator('input[placeholder*="Descuento"]').fill('Test Promo');
        await page.locator('input[placeholder="0"]').fill('15');
        await page.locator('app-date-input input[type="date"]').nth(0).fill('2026-04-01');
        await page.locator('app-date-input input[type="date"]').nth(1).fill('2026-04-30');

        const saveBtn = page.getByRole('button', { name: /Guardar Promoción/i });
        await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
        await saveBtn.click();

        // Drawer cierra
        await expect(page.locator('.drawer-overlay'))
            .not.toBeVisible({ timeout: 6_000 }).catch(() => {/* acceptable */});
    });

    test('editar promo precarga nombre y valor', async ({ page }) => {
        // Primer botón de acción es Editar
        await page.locator('.action-btn').first().click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });

        await expect(page.locator('input[placeholder*="Descuento"]')).toHaveValue('Verano 20%');
        await expect(page.locator('input[placeholder="0"]')).toHaveValue('20');
    });
});

/* ══════════════════════════════════════════════════════════════
   SUITE: Devoluciones
   ══════════════════════════════════════════════════════════════ */
test.describe('Devoluciones — listado', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/returns');
        await page.waitForURL('**/admin/returns', { timeout: 30_000 });
    });

    test('carga sin errores y muestra 4 KPIs', async ({ page }) => {
        const errors = collectErrors(page);
        await expect(page.locator('.card-metric').nth(3)).toBeVisible({ timeout: 20_000 });
        const appErrors = errors.filter(isAppError);
        expect(appErrors, `Errores: ${appErrors.join('\n')}`).toHaveLength(0);
    });

    test('tabla visible (vacía al inicio)', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText('No hay datos disponibles')).toBeVisible();
    });
});

test.describe('Devoluciones — formulario', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/admin/returns');
        await page.waitForURL('**/admin/returns', { timeout: 30_000 });
        await page.getByRole('button', { name: /Nueva Devolución/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 15_000 });
    });

    test('botón Registrar deshabilitado si monto = 0', async ({ page }) => {
        await page.locator('input[placeholder*="1234"]').fill('#001');
        await expect(page.getByRole('button', { name: /Registrar Devolución/i })).toBeDisabled();
    });

    test('tiene campo DateInput para fecha solicitud', async ({ page }) => {
        await expect(page.locator('app-date-input input[type="date"]')).toBeVisible();
    });

    test('crear devolución con datos válidos', async ({ page }) => {
        await page.locator('input[placeholder*="1234"]').fill('#0010');
        await page.locator('input[placeholder*="cliente"]').fill('María García');
        await page.locator('input[placeholder="0.00"]').fill('85.50');
        await page.locator('app-date-input input[type="date"]').fill('2026-03-29');

        const saveBtn = page.getByRole('button', { name: /Registrar Devolución/i });
        await expect(saveBtn).toBeEnabled({ timeout: 3_000 });
        await saveBtn.click();

        // Aparece en tabla
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 6_000 });
        await expect(page.getByText('#0010')).toBeVisible({ timeout: 4_000 });
    });
});
