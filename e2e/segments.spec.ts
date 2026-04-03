import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth.helper';

/**
 * Clientes — Segmentos
 * Verifica: que la ruta no es "Próximamente", tabla/estado vacío,
 * drawer CRUD, formulario con swatches de color, toggle activo.
 */
test.describe('Clientes — Segmentos', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('SEG-1 — Página carga y NO muestra "Próximamente"', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        // La ruta ya no apunta a ProximamenteComponent
        await expect(page.locator('text=Próximamente')).not.toBeVisible({ timeout: 5_000 });
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
    });

    test('SEG-2 — Subtítulo descriptivo visible', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-subtitle').filter({ hasText: /clasificación/i }).first()
        ).toBeVisible({ timeout: 10_000 });
    });

    test('SEG-3 — Barra de búsqueda visible', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('.filters-bar .search-box input')).toBeVisible({ timeout: 10_000 });
    });

    test('SEG-4 — Tabla o estado vacío visible', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        const tableOrEmpty = page.locator('.table-container, .empty-state');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 15_000 });
    });

    test('SEG-5 — Botón "Nuevo Segmento" abre Drawer desde la derecha', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });

        const btn = page.getByRole('button', { name: /nuevo segmento/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();

        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-header').filter({ hasText: /nuevo segmento/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('SEG-6 — Formulario contiene campos: nombre, tipo, color, descripción', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo segmento/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        // Campos del formulario
        await expect(page.locator('#seg-nombre')).toBeVisible({ timeout: 3_000 });
        await expect(page.locator('#seg-tipo')).toBeVisible({ timeout: 3_000 });
        await expect(page.locator('#seg-desc')).toBeVisible({ timeout: 3_000 });

        // Color swatches
        await expect(page.locator('.color-picker-row .color-swatch').first())
            .toBeVisible({ timeout: 3_000 });

        // Toggle activo
        await expect(page.locator('.toggle-label')).toBeVisible({ timeout: 3_000 });
    });

    test('SEG-7 — Botones Cancelar/Crear en footer del drawer', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo segmento/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        await expect(page.locator('.drawer-footer button').filter({ hasText: /cancelar/i }))
            .toBeVisible({ timeout: 3_000 });
        await expect(page.locator('.drawer-footer button').filter({ hasText: /crear/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('SEG-8 — Cerrar Drawer con botón Cancelar', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo segmento/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        await page.locator('.drawer-footer button').filter({ hasText: /cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 3_000 });
    });

    test('SEG-9 — URL permanece en /admin/segments al operar el Drawer', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo segmento/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/segments$/, { timeout: 3_000 });
    });

    test('SEG-10 — Validación: botón Crear deshabilitado con form vacío', async ({ page }) => {
        await page.goto('/admin/segments');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /segmentos/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo segmento/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        // Limpiar el campo nombre (por si tiene valor por defecto)
        await page.locator('#seg-nombre').clear();

        // El botón "Crear Segmento" debe estar deshabilitado si nombre está vacío
        const createBtn = page.locator('.drawer-footer button').filter({ hasText: /crear/i });
        await expect(createBtn).toBeDisabled({ timeout: 3_000 });
    });

});
