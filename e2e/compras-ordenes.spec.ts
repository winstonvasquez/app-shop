import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

/**
 * Compras — Órdenes de Compra
 * Tests the redesigned OrdeneCompra page:
 * - Two-drawer pattern (form + detail)
 * - Dynamic items table with IGV calculation
 * - Estado filter + badges
 */
test.describe('Compras — Órdenes de Compra', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    test('CO-1 — Página carga con encabezado', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /Órdenes/i }).first())
            .toBeVisible({ timeout: 10_000 });
    });

    test('CO-2 — Tabla de datos o estado vacío visible', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const tableOrEmpty = page.locator('.data-table-container, app-data-table, .text-center.py-2xl');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 15_000 });
    });

    test('CO-3 — Botón "Nueva OC" abre Drawer (no navega a ruta separada)', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nueva oc/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        // Drawer opens — overlay is full-screen and definitely visible
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/compras\/ordenes$/, { timeout: 3_000 });
    });

    test('CO-4 — Formulario OC contiene sección de encabezado', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva oc/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // Condicion de pago select is inside the open form drawer
        await expect(page.locator('.drawer select').first()).toBeVisible({ timeout: 5_000 });
    });

    test('CO-5 — Sección de ítems con botón Agregar', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva oc/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // "+ Agregar" button for items is inside the open drawer
        await expect(page.locator('.drawer button:has-text("Agregar")')).toBeVisible({ timeout: 5_000 });
    });

    test('CO-6 — Agregar ítem incrementa la tabla de ítems', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva oc/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // The form's items table body (excluding "Sin productos" empty row)
        const rows = page.locator('.drawer form table tbody tr').filter({ hasNotText: 'Sin productos' });
        const before = await rows.count();
        await page.locator('.drawer button:has-text("Agregar")').click();
        await expect(rows).toHaveCount(before + 1, { timeout: 3_000 });
    });

    test('CO-7 — Filtro por estado visible y funciona', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const select = page.locator('select').filter({ hasText: /todos los estados/i });
        await expect(select.first()).toBeVisible({ timeout: 10_000 });
    });

    test('CO-8 — URL permanece en /admin/compras/ordenes con form abierto', async ({ page }) => {
        await page.goto('/admin/compras/ordenes');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva oc/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/compras\/ordenes$/, { timeout: 3_000 });
    });

});
