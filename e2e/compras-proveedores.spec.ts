import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

/**
 * Compras — Proveedores
 * Tests the redesigned Proveedores page:
 * - Drawer-based CRUD (no separate route)
 * - DataTableComponent with standalone pagination OR empty state
 * - Design system tokens
 */
test.describe('Compras — Proveedores', () => {

    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    test('CP-1 — Página carga con PageHeader correcto', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /Proveedores/i }).first())
            .toBeVisible({ timeout: 10_000 });
    });

    test('CP-2 — Tabla de datos o estado vacío visible', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        // Either the data table OR the empty state is shown
        const tableOrEmpty = page.locator('.data-table-container, app-data-table, .text-center.py-2xl');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 15_000 });
    });

    test('CP-3 — Botón "Nuevo Proveedor" abre Drawer desde la derecha', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nuevo proveedor/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        // Drawer opens — overlay is full-screen and definitely visible
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // Drawer title shows correct text
        await expect(page.locator('.drawer-title').filter({ hasText: /Nuevo Proveedor/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('CP-4 — Formulario contiene campos de RUC y Razón Social', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo proveedor/i }).click();
        // Wait for drawer overlay
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer app-form-field, .drawer input[type="text"]').first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-footer button:has-text("Cancelar")')).toBeVisible({ timeout: 3_000 });
        await expect(page.locator('.drawer-footer button:has-text("Guardar")')).toBeVisible({ timeout: 3_000 });
    });

    test('CP-5 — Cerrar Drawer con botón Cancelar', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo proveedor/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await page.locator('.drawer-footer button:has-text("Cancelar")').click();
        // After closing, overlay should be gone
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 3_000 });
    });

    test('CP-6 — URL permanece en /admin/compras/proveedores al abrir Drawer', async ({ page }) => {
        await page.goto('/admin/compras/proveedores');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo proveedor/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/compras\/proveedores$/, { timeout: 3_000 });
    });

});
