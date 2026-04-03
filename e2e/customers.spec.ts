import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth.helper';

/**
 * Clientes — Lista de Clientes
 * Verifica: tabla estándar, app-pagination, drawer CRUD, diseño unificado.
 */
test.describe('Clientes — Lista de Clientes', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('CLI-1 — Página carga con cabecera y título correcto', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-header h1, .page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });
    });

    test('CLI-2 — Barra de búsqueda visible', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('.filters-bar .search-box input')).toBeVisible({ timeout: 10_000 });
    });

    test('CLI-3 — Tabla con clases estándar o estado vacío visible', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        const tableOrEmpty = page.locator('.table-container, .empty-state');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 15_000 });
    });

    test('CLI-4 — Botón "Nuevo Cliente" abre Drawer desde la derecha', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-header h1, .page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });

        const btn = page.getByRole('button', { name: /nuevo cliente/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();

        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-header').filter({ hasText: /nuevo cliente/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('CLI-5 — Formulario contiene secciones y campos de credenciales y datos personales', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo cliente/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        // Secciones de formulario
        await expect(page.locator('.form-section-title').filter({ hasText: /credenciales/i }))
            .toBeVisible({ timeout: 3_000 });
        await expect(page.locator('.form-section-title').filter({ hasText: /datos personales/i }))
            .toBeVisible({ timeout: 3_000 });

        // Campos principales
        await expect(page.locator('#username')).toBeVisible({ timeout: 3_000 });
        await expect(page.locator('#email')).toBeVisible({ timeout: 3_000 });
        await expect(page.locator('#fechaNacimiento')).toBeVisible({ timeout: 3_000 });

        // Campo fecha tiene atributo max (= hoy)
        const maxAttr = await page.locator('#fechaNacimiento').getAttribute('max');
        expect(maxAttr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('CLI-6 — Botones Cancelar/Crear en footer del drawer', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo cliente/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        await expect(page.locator('.drawer-footer button').filter({ hasText: /cancelar/i }))
            .toBeVisible({ timeout: 3_000 });
        await expect(page.locator('.drawer-footer button').filter({ hasText: /crear/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('CLI-7 — Cerrar Drawer con botón Cancelar', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo cliente/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });

        await page.locator('.drawer-footer button').filter({ hasText: /cancelar/i }).click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 3_000 });
    });

    test('CLI-8 — app-pagination visible cuando hay registros', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');

        const hasTable = await page.locator('.table-container').waitFor({ timeout: 15_000 })
            .then(() => true).catch(() => false);

        if (hasTable) {
            await expect(page.locator('app-pagination .pg-bar')).toBeVisible({ timeout: 5_000 });
        } else {
            // Estado vacío también es válido
            await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5_000 });
        }
    });

    test('CLI-9 — URL permanece en /admin/customers al operar el Drawer', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('domcontentloaded');
        await expect(
            page.locator('.page-title').filter({ hasText: /clientes/i }).first()
        ).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo cliente/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/customers$/, { timeout: 3_000 });
    });

});
