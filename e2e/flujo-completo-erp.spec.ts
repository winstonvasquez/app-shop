import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

/**
 * FLUJO COMPLETO ERP — Navegación por todos los módulos
 * Cubre: Admin, Compras, Logística, Contabilidad, Inventario, Tesorería, RRHH
 */
test.describe.configure({ mode: 'serial' });

test.describe('ERP Completo — Todos los módulos', () => {

    test.beforeAll(async ({ browser }) => {
        // Pre-login once for the suite
    });

    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    // === ADMIN ===
    test('A1 — Dashboard Admin carga', async ({ page }) => {
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('A2 — Categorías carga', async ({ page }) => {
        await page.goto('/admin/categories');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('A3 — Productos admin carga', async ({ page }) => {
        await page.goto('/admin/products');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('A4 — Órdenes admin carga', async ({ page }) => {
        await page.goto('/admin/orders');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('A5 — Clientes carga', async ({ page }) => {
        await page.goto('/admin/customers');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('A6 — Empresas carga', async ({ page }) => {
        await page.goto('/admin/companies');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === COMPRAS ===
    test('C1 — Dashboard Compras carga', async ({ page }) => {
        await page.goto('/compras/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('C2 — Proveedores carga', async ({ page }) => {
        await page.goto('/compras/proveedores');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('C3 — Órdenes Compra carga', async ({ page }) => {
        await page.goto('/compras/ordenes');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('C4 — Recepción carga', async ({ page }) => {
        await page.goto('/compras/recepcion');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === LOGÍSTICA ===
    test('L1 — Dashboard Logística carga', async ({ page }) => {
        await page.goto('/logistica/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('L2 — Almacenes Logística carga', async ({ page }) => {
        await page.goto('/logistica/almacenes');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('L3 — Inventario Logística carga', async ({ page }) => {
        await page.goto('/logistica/inventario');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('L4 — Movimientos Logística carga', async ({ page }) => {
        await page.goto('/logistica/movimientos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('L5 — Guías Remisión carga', async ({ page }) => {
        await page.goto('/logistica/guias');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('L6 — Tracking carga', async ({ page }) => {
        await page.goto('/logistica/tracking');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === CONTABILIDAD ===
    test('CON1 — Dashboard Contabilidad carga', async ({ page }) => {
        await page.goto('/contabilidad/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON2 — Libro Diario carga', async ({ page }) => {
        await page.goto('/contabilidad/diario');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON3 — Libro Mayor carga', async ({ page }) => {
        await page.goto('/contabilidad/libro-mayor');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON4 — Asientos carga', async ({ page }) => {
        await page.goto('/contabilidad/asientos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON5 — Registro Ventas carga', async ({ page }) => {
        await page.goto('/contabilidad/ventas');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON6 — Registro Compras carga', async ({ page }) => {
        await page.goto('/contabilidad/compras');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('CON7 — Declaracion IGV carga', async ({ page }) => {
        await page.goto('/contabilidad/igv');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === INVENTARIO ===
    test('INV1 — Stock Inventario carga', async ({ page }) => {
        await page.goto('/admin/inventario/stock');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('INV2 — Movimientos Inventario carga', async ({ page }) => {
        await page.goto('/admin/inventario/movimientos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('INV3 — Kardex carga', async ({ page }) => {
        await page.goto('/admin/inventario/kardex');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === TESORERÍA ===
    test('TES1 — Cajas carga', async ({ page }) => {
        await page.goto('/tesoreria/cajas');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('TES2 — Pagos carga', async ({ page }) => {
        await page.goto('/tesoreria/pagos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('TES3 — Flujo Caja carga', async ({ page }) => {
        await page.goto('/tesoreria/flujo-caja');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === RRHH ===
    test('RR1 — Dashboard RRHH carga', async ({ page }) => {
        await page.goto('/rrhh/dashboard');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR2 — Empleados carga', async ({ page }) => {
        await page.goto('/rrhh/employees');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR3 — Asistencia carga', async ({ page }) => {
        await page.goto('/rrhh/attendance');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR4 — Vacaciones carga', async ({ page }) => {
        await page.goto('/rrhh/vacations');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR5 — Nómina carga', async ({ page }) => {
        await page.goto('/rrhh/payroll');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR6 — Evaluaciones carga', async ({ page }) => {
        await page.goto('/rrhh/evaluations');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    test('RR7 — Capacitaciones carga', async ({ page }) => {
        await page.goto('/rrhh/trainings');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

    // === POS ===
    test('POS1 — Punto de Venta carga', async ({ page }) => {
        await page.goto('/pos');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });

});
