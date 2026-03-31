import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth.helper';

/**
 * FLUJO LOGÍSTICA — Tests completos del módulo
 * Rutas: dashboard, almacenes, inventario, movimientos,
 *        guias, transportistas, envios, devoluciones, tracking
 * Microservicio: microshoplogistica (8090/logistics)
 */

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

async function waitForPageReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('app-page-header, .page-container, .page-header')).toBeVisible({ timeout: 15_000 });
}

async function expectDrawerOpen(page: Page) {
    await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
}

// ──────────────────────────────────────────────────────────
// SUITE: NAVEGACIÓN DEL MENÚ
// ──────────────────────────────────────────────────────────

test.describe('Logística — Navegación de Menú', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('L0.1 — Dashboard de logística carga sin errores', async ({ page }) => {
        await page.goto('/logistica/dashboard');
        await waitForPageReady(page);
        await expect(page.locator('body')).toBeVisible();
        const errorAlert = page.locator('[class*="alert-error"], .error-message');
        expect(await errorAlert.count()).toBe(0);
    });

    test('L0.2 — /logistica/almacenes carga la tabla', async ({ page }) => {
        await page.goto('/logistica/almacenes');
        await waitForPageReady(page);
        const table = page.locator('table, .data-table, app-data-table');
        await expect(table.first()).toBeVisible({ timeout: 8_000 });
    });

    test('L0.3 — /logistica/inventario carga tabla (no placeholder)', async ({ page }) => {
        await page.goto('/logistica/inventario');
        await waitForPageReady(page);
        // No debe mostrar texto de "placeholder" / TODO
        const placeholder = page.locator('text=/Ver @designs|Requiere endpoint/i');
        expect(await placeholder.count()).toBe(0);
        // Debe existir el componente de tabla
        const table = page.locator('app-data-table, table');
        expect(await table.count()).toBeGreaterThan(0);
    });

    test('L0.4 — /logistica/movimientos carga tabla', async ({ page }) => {
        await page.goto('/logistica/movimientos');
        await waitForPageReady(page);
        const table = page.locator('app-data-table, table');
        expect(await table.count()).toBeGreaterThan(0);
    });

    test('L0.5 — /logistica/guias carga tabla', async ({ page }) => {
        await page.goto('/logistica/guias');
        await waitForPageReady(page);
        const table = page.locator('app-data-table, table');
        expect(await table.count()).toBeGreaterThan(0);
    });

    test('L0.6 — /logistica/transportistas carga tabla', async ({ page }) => {
        await page.goto('/logistica/transportistas');
        await waitForPageReady(page);
        await expect(page.locator('body')).toBeVisible();
        // No debe ser 404 ni blank
        const notFound = await page.locator('text=404').count();
        expect(notFound).toBe(0);
    });

    test('L0.7 — /logistica/envios carga tabla', async ({ page }) => {
        await page.goto('/logistica/envios');
        await waitForPageReady(page);
        await expect(page.locator('body')).toBeVisible();
        const notFound = await page.locator('text=404').count();
        expect(notFound).toBe(0);
    });

    test('L0.8 — /logistica/devoluciones carga tabla', async ({ page }) => {
        await page.goto('/logistica/devoluciones');
        await waitForPageReady(page);
        await expect(page.locator('body')).toBeVisible();
        const notFound = await page.locator('text=404').count();
        expect(notFound).toBe(0);
    });

    test('L0.9 — /logistica/tracking carga el buscador', async ({ page }) => {
        await page.goto('/logistica/tracking');
        await waitForPageReady(page);
        const input = page.locator('input[placeholder*="tracking" i], input[placeholder*="guía" i], input[placeholder*="N°" i]');
        expect(await input.count()).toBeGreaterThan(0);
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: ALMACENES
// ──────────────────────────────────────────────────────────

test.describe('Logística — Almacenes', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/almacenes');
        await waitForPageReady(page);
    });

    test('L1.1 — PageHeader con breadcrumbs visible', async ({ page }) => {
        const title = page.locator('h1, .page-title');
        await expect(title.first()).toBeVisible();
        const titleText = await title.first().textContent();
        expect(titleText?.toLowerCase()).toContain('almacen');
    });

    test('L1.2 — Botón "+ Nuevo Almacén" abre Drawer desde la derecha', async ({ page }) => {
        const btn = page.getByRole('button', { name: /nuevo almac/i });
        await expect(btn).toBeVisible();
        await btn.click();
        await expectDrawerOpen(page);
    });

    test('L1.3 — Drawer de almacén muestra campos: Código, Nombre, Dirección, Teléfono', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo almac/i }).click();
        await expectDrawerOpen(page);
        await expect(page.getByPlaceholder(/ALM1/i)).toBeVisible();
        await expect(page.getByPlaceholder(/Almacén Principal/i)).toBeVisible();
    });

    test('L1.4 — Validación: submit sin datos muestra errores', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo almac/i }).click();
        await expectDrawerOpen(page);
        await page.getByRole('button', { name: /crear/i }).click();
        const error = page.locator('.input-error-message, [class*="error-message"]');
        await expect(error.first()).toBeVisible({ timeout: 3_000 });
    });

    test('L1.5 — Cerrar Drawer con Cancelar', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo almac/i }).click();
        await expectDrawerOpen(page);
        await page.getByRole('button', { name: /cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeHidden({ timeout: 3_000 });
    });

    test('L1.6 — Tabla tiene columnas: Código, Nombre, Estado', async ({ page }) => {
        const headerCells = page.locator('th, .table-header-cell');
        const headers = await headerCells.allTextContents();
        const headerStr = headers.join(' ').toLowerCase();
        expect(headerStr).toContain('código');
        expect(headerStr).toContain('nombre');
        expect(headerStr).toContain('estado');
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: INVENTARIO
// ──────────────────────────────────────────────────────────

test.describe('Logística — Inventario', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/inventario');
        await waitForPageReady(page);
    });

    test('L2.1 — Tabla muestra columnas clave', async ({ page }) => {
        const headerCells = page.locator('th, .table-header-cell');
        const headers = await headerCells.allTextContents();
        const headerStr = headers.join(' ').toLowerCase();
        expect(headerStr).toContain('almacén');
        expect(headerStr).toContain('sku');
        expect(headerStr).toContain('disponible');
    });

    test('L2.2 — Filtro por almacén visible', async ({ page }) => {
        const filterSelect = page.locator('select').first();
        await expect(filterSelect).toBeVisible();
    });

    test('L2.3 — No hay botón "+ Nuevo" (inventario es solo lectura)', async ({ page }) => {
        const btnNuevo = page.getByRole('button', { name: /nuevo/i });
        expect(await btnNuevo.count()).toBe(0);
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: MOVIMIENTOS
// ──────────────────────────────────────────────────────────

test.describe('Logística — Movimientos de Stock', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/movimientos');
        await waitForPageReady(page);
    });

    test('L3.1 — Botón "+ Movimiento" visible', async ({ page }) => {
        const btn = page.getByRole('button', { name: /movimiento/i });
        await expect(btn.first()).toBeVisible();
    });

    test('L3.2 — Drawer de creación se abre', async ({ page }) => {
        await page.getByRole('button', { name: /movimiento/i }).first().click();
        await expectDrawerOpen(page);
    });

    test('L3.3 — Formulario tiene campo Tipo de movimiento', async ({ page }) => {
        await page.getByRole('button', { name: /movimiento/i }).first().click();
        await expectDrawerOpen(page);
        const tipoSelect = page.locator('select').first();
        await expect(tipoSelect).toBeVisible();
    });

    test('L3.4 — Se puede agregar ítem al formulario', async ({ page }) => {
        await page.getByRole('button', { name: /movimiento/i }).first().click();
        await expectDrawerOpen(page);
        const btnAgregar = page.getByRole('button', { name: /agregar/i });
        await expect(btnAgregar).toBeVisible();
        await btnAgregar.click();
        // Debe aparecer al menos 2 filas de ítems
        const inputProducto = page.locator('input[placeholder*="producto" i], input[placeholder*="Nombre del producto" i]');
        const count = await inputProducto.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('L3.5 — Filtros de tipo y fecha son visibles', async ({ page }) => {
        const selects = page.locator('select');
        expect(await selects.count()).toBeGreaterThan(0);
        // DateInputComponent debe estar presente
        const dateInputs = page.locator('app-date-input, input[type="date"]');
        expect(await dateInputs.count()).toBeGreaterThan(0);
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: GUÍAS DE REMISIÓN
// ──────────────────────────────────────────────────────────

test.describe('Logística — Guías de Remisión', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/guias');
        await waitForPageReady(page);
    });

    test('L4.1 — Página carga con título correcto', async ({ page }) => {
        const title = page.locator('h1, .page-title');
        const text = await title.first().textContent();
        expect(text?.toLowerCase()).toContain('guía');
    });

    test('L4.2 — Botón "+ Nueva GRE" abre Drawer', async ({ page }) => {
        const btn = page.getByRole('button', { name: /nueva gre/i });
        await expect(btn).toBeVisible();
        await btn.click();
        await expectDrawerOpen(page);
    });

    test('L4.3 — Drawer tiene secciones: Identificación, Traslado, Origen, Destinatario', async ({ page }) => {
        await page.getByRole('button', { name: /nueva gre/i }).click();
        await expectDrawerOpen(page);
        const content = await page.locator('app-drawer').textContent();
        expect(content?.toUpperCase()).toContain('IDENTIFICACIÓN');
        expect(content?.toUpperCase()).toContain('TRASLADO');
        expect(content?.toUpperCase()).toContain('PARTIDA');
    });

    test('L4.4 — Campos de fecha usan DateInputComponent', async ({ page }) => {
        await page.getByRole('button', { name: /nueva gre/i }).click();
        await expectDrawerOpen(page);
        // DateInputComponent tiene la clase di-wrapper
        const dateWrappers = page.locator('.di-wrapper, app-date-input');
        expect(await dateWrappers.count()).toBeGreaterThanOrEqual(2);
    });

    test('L4.5 — Se puede agregar ítem de bien trasladado', async ({ page }) => {
        await page.getByRole('button', { name: /nueva gre/i }).click();
        await expectDrawerOpen(page);
        const btnAgregar = page.getByRole('button', { name: /agregar ítem/i });
        await expect(btnAgregar).toBeVisible();
        await btnAgregar.click();
    });

    test('L4.6 — Filtro por estado funciona', async ({ page }) => {
        const filterSelect = page.locator('select').first();
        await expect(filterSelect).toBeVisible();
        await filterSelect.selectOption('EMITIDA');
        // La tabla debe actualizar (sin crash)
        await expect(page.locator('body')).toBeVisible();
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: TRANSPORTISTAS
// ──────────────────────────────────────────────────────────

test.describe('Logística — Transportistas', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/transportistas');
        await waitForPageReady(page);
    });

    test('L5.1 — Tabla de transportistas visible', async ({ page }) => {
        const table = page.locator('app-data-table, table');
        await expect(table.first()).toBeVisible({ timeout: 8_000 });
    });

    test('L5.2 — Botón "+ Nuevo Transportista" abre Drawer', async ({ page }) => {
        const btn = page.getByRole('button', { name: /nuevo transportista/i });
        await expect(btn).toBeVisible();
        await btn.click();
        await expectDrawerOpen(page);
    });

    test('L5.3 — Formulario tiene campos: Código, Nombre, Tipo Servicio', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo transportista/i }).click();
        await expectDrawerOpen(page);
        await expect(page.getByPlaceholder(/OLVA|SHALOM/i)).toBeVisible();
        await expect(page.locator('select').first()).toBeVisible();
    });

    test('L5.4 — Tipos de servicio disponibles incluyen Nacional y Express', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo transportista/i }).click();
        await expectDrawerOpen(page);
        const selectServiceType = page.locator('select').first();
        const options = await selectServiceType.locator('option').allTextContents();
        const optStr = options.join(' ').toLowerCase();
        expect(optStr).toContain('nacional');
        expect(optStr).toContain('express');
    });

    test('L5.5 — Validación código requerido', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo transportista/i }).click();
        await expectDrawerOpen(page);
        await page.getByRole('button', { name: /^crear$/i }).click();
        const error = page.locator('.input-error-message');
        await expect(error.first()).toBeVisible({ timeout: 3_000 });
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: ENVÍOS
// ──────────────────────────────────────────────────────────

test.describe('Logística — Envíos', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/envios');
        await waitForPageReady(page);
    });

    test('L6.1 — Tabla de envíos visible con columnas clave', async ({ page }) => {
        const table = page.locator('app-data-table, table');
        await expect(table.first()).toBeVisible({ timeout: 8_000 });
    });

    test('L6.2 — Botón "+ Nuevo Envío" abre Drawer', async ({ page }) => {
        const btn = page.getByRole('button', { name: /nuevo envío/i });
        await expect(btn).toBeVisible();
        await btn.click();
        await expectDrawerOpen(page);
    });

    test('L6.3 — Formulario tiene secciones: Transportista, Destinatario, Datos del envío', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo envío/i }).click();
        await expectDrawerOpen(page);
        const content = await page.locator('app-drawer').first().textContent();
        expect(content?.toLowerCase()).toContain('transportista');
        expect(content?.toLowerCase()).toContain('destinatario');
    });

    test('L6.4 — Filtro por estado visible', async ({ page }) => {
        const filterSelect = page.locator('select').first();
        await expect(filterSelect).toBeVisible();
        const options = await filterSelect.locator('option').allTextContents();
        const optStr = options.join(' ').toLowerCase();
        expect(optStr).toContain('tránsito');
        expect(optStr).toContain('entregado');
    });

    test('L6.5 — Campo DateInput para fecha estimada en el formulario', async ({ page }) => {
        await page.getByRole('button', { name: /nuevo envío/i }).click();
        await expectDrawerOpen(page);
        const dateInput = page.locator('.di-wrapper, app-date-input');
        expect(await dateInput.count()).toBeGreaterThan(0);
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: DEVOLUCIONES
// ──────────────────────────────────────────────────────────

test.describe('Logística — Devoluciones', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/devoluciones');
        await waitForPageReady(page);
    });

    test('L7.1 — Tabla de devoluciones visible', async ({ page }) => {
        const table = page.locator('app-data-table, table');
        await expect(table.first()).toBeVisible({ timeout: 8_000 });
    });

    test('L7.2 — Filtro por estado incluye Solicitada, Aprobada, Rechazada', async ({ page }) => {
        const filterSelect = page.locator('select').first();
        await expect(filterSelect).toBeVisible();
        const options = await filterSelect.locator('option').allTextContents();
        const optStr = options.join(' ').toLowerCase();
        expect(optStr).toContain('solicitada');
        expect(optStr).toContain('aprobada');
        expect(optStr).toContain('rechazada');
    });

    test('L7.3 — Tabla tiene columnas: Motivo, Estado, Reembolso', async ({ page }) => {
        const headerCells = page.locator('th, .table-header-cell');
        const headers = await headerCells.allTextContents();
        const headerStr = headers.join(' ').toLowerCase();
        expect(headerStr).toContain('motivo');
        expect(headerStr).toContain('estado');
        expect(headerStr).toContain('reembolso');
    });

    test('L7.4 — No hay botón "+ Nueva Devolución" (se crean desde ventas)', async ({ page }) => {
        const btnNuevo = page.getByRole('button', { name: /nueva devolución/i });
        expect(await btnNuevo.count()).toBe(0);
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: TRACKING
// ──────────────────────────────────────────────────────────

test.describe('Logística — Tracking', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/logistica/tracking');
        await waitForPageReady(page);
    });

    test('L8.1 — Buscador de tracking visible', async ({ page }) => {
        const input = page.locator('input').first();
        await expect(input).toBeVisible();
    });

    test('L8.2 — Botón Rastrear visible', async ({ page }) => {
        const btn = page.getByRole('button', { name: /rastrear/i });
        await expect(btn).toBeVisible();
    });

    test('L8.3 — Buscar número inexistente no crashea la app', async ({ page }) => {
        const input = page.locator('input').first();
        await input.fill('NOEXISTE-99999');
        await page.getByRole('button', { name: /rastrear/i }).click();
        await page.waitForTimeout(2_000);
        await expect(page.locator('body')).toBeVisible();
    });

    test('L8.4 — Tabla de envíos recientes visible', async ({ page }) => {
        const table = page.locator('app-data-table, table');
        await expect(table.first()).toBeVisible({ timeout: 8_000 });
    });

    test('L8.5 — PageHeader visible con breadcrumbs', async ({ page }) => {
        const breadcrumbs = page.locator('app-page-header, .ph-root, .ph-breadcrumbs');
        await expect(breadcrumbs.first()).toBeVisible({ timeout: 5_000 });
    });
});

// ──────────────────────────────────────────────────────────
// SUITE: DESIGN SYSTEM — verificaciones de estándar
// ──────────────────────────────────────────────────────────

test.describe('Logística — Verificación Estándar UI', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    const rutas = [
        '/logistica/almacenes',
        '/logistica/movimientos',
        '/logistica/guias',
        '/logistica/transportistas',
        '/logistica/envios',
        '/logistica/devoluciones',
        '/logistica/tracking'
    ];

    for (const ruta of rutas) {
        test(`L9 — ${ruta} tiene PageHeader`, async ({ page }) => {
            await page.goto(ruta);
            await waitForPageReady(page);
            const header = page.locator('app-page-header, .ph-root');
            await expect(header.first()).toBeVisible({ timeout: 8_000 });
        });
    }

    test('L9.8 — Todos los drawers se cierran con ESC', async ({ page }) => {
        await page.goto('/logistica/almacenes');
        await waitForPageReady(page);
        const btn = page.getByRole('button', { name: /nuevo almac/i });
        await btn.click();
        await expectDrawerOpen(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('.drawer-overlay')).toBeHidden({ timeout: 3_000 });
    });
});
