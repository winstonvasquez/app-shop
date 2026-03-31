import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

/**
 * Compras — Recepción de Mercadería
 * Tests the updated Recepcion page:
 * - Real pagination (standalone app-pagination)
 * - Drawer-based detail (replaces /recepcion/:id route)
 * - PageHeaderComponent used
 */
test.describe('Compras — Recepción de Mercadería', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    test('CR-1 — Página carga con PageHeader correcto', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /Recepción/i }).first())
            .toBeVisible({ timeout: 10_000 });
    });

    test('CR-2 — Tabla de datos o estado vacío visible', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const tableOrEmpty = page.locator('.data-table-container, app-data-table, .text-center.py-2xl');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 15_000 });
    });

    test('CR-3 — Filtro de estado visible', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const select = page.locator('select').filter({ hasText: /todos los estados/i });
        await expect(select.first()).toBeVisible({ timeout: 10_000 });
    });

    test('CR-4 — Botón "Ver" abre Drawer (no navega a /recepcion/:id)', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const verBtn = page.locator('.action-btn, button').filter({ hasText: 'Ver' }).first();
        const count = await verBtn.count();
        if (count > 0 && await verBtn.isVisible()) {
            await verBtn.click();
            // Must stay on same URL
            await expect(page).toHaveURL(/\/admin\/compras\/recepcion$/, { timeout: 3_000 });
            // Drawer opens — overlay visible
            await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        } else {
            test.skip(true, 'No recepciones in database to test detail view');
        }
    });

    test('CR-5 — Drawer de detalle contiene info de recepción', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const verBtn = page.locator('.action-btn, button').filter({ hasText: 'Ver' }).first();
        if (await verBtn.count() > 0 && await verBtn.isVisible()) {
            await verBtn.click();
            await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
            await expect(page.getByText(/Datos de la Recepción/i)).toBeVisible({ timeout: 5_000 });
        } else {
            test.skip(true, 'No recepciones in database');
        }
    });

    test('CR-6 — Drawer tiene botón Cerrar en footer', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const verBtn = page.locator('.action-btn, button').filter({ hasText: 'Ver' }).first();
        if (await verBtn.count() > 0 && await verBtn.isVisible()) {
            await verBtn.click();
            await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
            await expect(page.locator('.drawer-footer button:has-text("Cerrar")')).toBeVisible({ timeout: 3_000 });
        } else {
            test.skip(true, 'No recepciones in database');
        }
    });

    test('CR-7 — app-pagination está fuera de app-data-table (standalone)', async ({ page }) => {
        await page.goto('/admin/compras/recepcion');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        // The data table should be visible
        await expect(page.locator('.data-table-container, app-data-table').first()).toBeVisible({ timeout: 10_000 });
        // Internal pagination (inside DataTable) should be hidden
        const paginationInsideTable = page.locator('app-data-table app-pagination');
        const internalPg = await paginationInsideTable.count();
        if (internalPg > 0) {
            await expect(paginationInsideTable.first()).not.toBeVisible();
        }
    });

});
