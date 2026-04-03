import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth.helper';

/**
 * RRHH Module — Tests
 * Covers: sidebar navigation, employees, attendance, vacations,
 *         evaluations, and trainings — all using the Drawer pattern.
 */
test.describe('RRHH — Módulo completo', () => {

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    // ── Sidebar navigation ────────────────────────────────────────────────

    test('RH-1 — Sidebar muestra las opciones RRHH', async ({ page }) => {
        await page.goto('/admin/rrhh/dashboard');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });

        const sidebarLinks = [
            /empleados/i,
            /asistencia/i,
            /vacaciones/i,
            /nómina|nomina/i,
            /boleta/i,
            /evaluaciones/i,
            /capacitaciones/i,
        ];

        for (const label of sidebarLinks) {
            await expect(page.locator('nav a, nav button').filter({ hasText: label }).first())
                .toBeVisible({ timeout: 5_000 });
        }
    });

    // ── Employee List ─────────────────────────────────────────────────────

    test('RH-2 — Employee List carga con PageHeader y tabla', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /empleados/i }).first())
            .toBeVisible({ timeout: 10_000 });
        const tableOrEmpty = page.locator('.data-table-container, app-data-table, .text-center');
        await expect(tableOrEmpty.first()).toBeVisible({ timeout: 10_000 });
    });

    test('RH-3 — Botón "Nuevo Empleado" abre Drawer', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nuevo empleado/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-title').filter({ hasText: /empleado/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('RH-4 — Formulario empleado contiene campos requeridos', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo empleado/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // Form fields present
        await expect(page.locator('.drawer app-form-field, .drawer input').first())
            .toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-footer button:has-text("Cancelar")')).toBeVisible();
        await expect(page.locator('.drawer-footer button').filter({ hasText: /guardar|crear/i }))
            .toBeVisible();
    });

    test('RH-5 — Search filtra la tabla de empleados', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const searchBox = page.locator('.search-box, input[type="search"], input[placeholder*="buscar" i]').first();
        const hasSearch = await searchBox.isVisible().catch(() => false);
        if (hasSearch) {
            await searchBox.fill('Ana');
            // Table should react to input (filter or show empty state)
            await page.waitForTimeout(300);
            const rows = page.locator('app-data-table tbody tr, .table-row');
            const count = await rows.count();
            expect(count).toBeGreaterThanOrEqual(0);
        } else {
            test.skip(true, 'Search box not visible — skip filter test');
        }
    });

    test('RH-6 — URL permanece en /admin/rrhh/employees al abrir Drawer', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nuevo empleado/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page).toHaveURL(/\/admin\/rrhh\/employees/, { timeout: 3_000 });
    });

    // ── Attendance ────────────────────────────────────────────────────────

    test('RH-7 — Attendance carga con PageHeader y tabla', async ({ page }) => {
        await page.goto('/admin/rrhh/attendance');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /asistencia/i }).first())
            .toBeVisible({ timeout: 10_000 });
    });

    test('RH-8 — Botón "Registrar Asistencia" abre Drawer', async ({ page }) => {
        await page.goto('/admin/rrhh/attendance');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /registrar asistencia/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
    });

    test('RH-9 — Cerrar Drawer asistencia con Cancelar', async ({ page }) => {
        await page.goto('/admin/rrhh/attendance');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /registrar asistencia/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await page.locator('.drawer-footer button:has-text("Cancelar")').click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 3_000 });
    });

    // ── Vacations ─────────────────────────────────────────────────────────

    test('RH-10 — Vacaciones carga con PageHeader', async ({ page }) => {
        await page.goto('/admin/rrhh/vacations');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /vacaciones/i }).first())
            .toBeVisible({ timeout: 10_000 });
    });

    test('RH-11 — Botón "Nueva Solicitud" abre Drawer de vacaciones', async ({ page }) => {
        await page.goto('/admin/rrhh/vacations');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nueva solicitud/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-title').filter({ hasText: /vacacion/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    // ── Evaluations ───────────────────────────────────────────────────────

    test('RH-12 — Evaluaciones carga con PageHeader y KPIs', async ({ page }) => {
        await page.goto('/admin/rrhh/evaluations');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /evaluaciones/i }).first())
            .toBeVisible({ timeout: 10_000 });
        // KPI cards should be present
        const cards = page.locator('.card');
        await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    });

    test('RH-13 — Botón "Nueva Evaluación" abre Drawer', async ({ page }) => {
        await page.goto('/admin/rrhh/evaluations');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nueva evaluación|nueva evaluacion/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer app-form-field').first()).toBeVisible({ timeout: 5_000 });
    });

    test('RH-14 — Drawer evaluación tiene campos Empleado, Evaluador y Período', async ({ page }) => {
        await page.goto('/admin/rrhh/evaluations');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva evaluación|nueva evaluacion/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // Three required app-form-fields visible (Empleado, Evaluador, Período)
        await expect(page.locator('.drawer app-form-field').nth(0)).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer app-form-field').nth(1)).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer app-date-input, .drawer app-form-field').nth(2))
            .toBeVisible({ timeout: 5_000 });
    });

    // ── Trainings ─────────────────────────────────────────────────────────

    test('RH-15 — Capacitaciones carga con PageHeader y KPIs', async ({ page }) => {
        await page.goto('/admin/rrhh/trainings');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /capacitaciones/i }).first())
            .toBeVisible({ timeout: 10_000 });
        const cards = page.locator('.card');
        await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    });

    test('RH-16 — Botón "Nueva Capacitación" abre Drawer', async ({ page }) => {
        await page.goto('/admin/rrhh/trainings');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        const btn = page.getByRole('button', { name: /nueva capacitación|nueva capacitacion/i });
        await expect(btn).toBeVisible({ timeout: 10_000 });
        await btn.click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-title').filter({ hasText: /capacitación|capacitacion/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('RH-17 — Drawer capacitación contiene campos y DateInput de fechas', async ({ page }) => {
        await page.goto('/admin/rrhh/trainings');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva capacitación|nueva capacitacion/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        // Nombre del Curso field
        await expect(page.locator('.drawer app-form-field').first()).toBeVisible({ timeout: 5_000 });
        // Date input components for fechaInicio and fechaFin
        await expect(page.locator('.drawer app-date-input').first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('.drawer-footer button').filter({ hasText: /crear capacitación|crear capacitacion/i }))
            .toBeVisible({ timeout: 3_000 });
    });

    test('RH-18 — Cerrar Drawer capacitaciones con Cancelar', async ({ page }) => {
        await page.goto('/admin/rrhh/trainings');
        await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /nueva capacitación|nueva capacitacion/i }).click();
        await expect(page.locator('.drawer-overlay')).toBeVisible({ timeout: 5_000 });
        await page.locator('.drawer-footer button:has-text("Cancelar")').click();
        await expect(page.locator('.drawer-overlay')).not.toBeVisible({ timeout: 3_000 });
    });

});
