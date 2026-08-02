import { test, expect, Page } from '@playwright/test';

/**
 * Validación de los pedidos del usuario, punto por punto, contra el ERP real.
 *
 * Cada test comprueba UN pedido y falla con un mensaje que dice qué se esperaba.
 * No hay `skip` silencioso: si algo no se puede comprobar, el test lo dice.
 */

/** Espera a que una tabla tenga datos reales y no el shimmer de carga. */
async function esperarDatos(page: Page, patron = /\$|S\/ ?\d|\d{2}\/\d{2}/): Promise<void> {
    await expect(page.locator('tbody tr td').filter({ hasText: patron }).first())
        .toBeVisible({ timeout: 30_000 });
}

test.describe('Validación de los pedidos', () => {

    // ── 1. Alcance de promoción vinculable ────────────────────────────────
    test('1) el alcance de la promoción permite elegir producto, categoría o monto', async ({ page }) => {
        await page.goto('/admin/promotions');
        await page.getByRole('button', { name: /Nueva Promoci/i }).click();
        await page.waitForTimeout(800);

        const alcance = page.locator('select[formcontrolname="alcance"]');
        await expect(alcance, 'debe existir el select de Alcance').toBeVisible();

        // PRODUCTO → buscador de producto habilitado, monto deshabilitado.
        await alcance.selectOption({ value: 'PRODUCTO' });
        await page.waitForTimeout(500);
        const buscadorProducto = page.locator('app-server-search-select input, [formcontrolname="productoId"]').first();
        await expect(buscadorProducto, 'PRODUCTO debe habilitar el selector de producto').toBeEnabled();

        // CATEGORIA → select de categoría habilitado y CON opciones reales.
        await alcance.selectOption({ value: 'CATEGORIA' });
        await page.waitForTimeout(500);
        const selCategoria = page.locator('select[formcontrolname="categoriaId"]');
        await expect(selCategoria, 'CATEGORIA debe habilitar el select de categoría').toBeEnabled();
        const opciones = await selCategoria.locator('option').count();
        expect(opciones, 'el select de categoría debe traer categorías del backend').toBeGreaterThan(1);

        // CARRITO → monto mínimo habilitado.
        await alcance.selectOption({ value: 'CARRITO' });
        await page.waitForTimeout(500);
        await expect(page.locator('[formcontrolname="montoMinimo"]'),
            'CARRITO debe habilitar el monto mínimo').toBeEnabled();
    });

    // ── 3. «Ver detalle» de cliente ya no devuelve 400 ───────────────────
    test('3) el detalle de cliente carga sin error del backend', async ({ page }) => {
        const errores: string[] = [];
        page.on('response', r => {
            if (r.status() >= 400 && r.url().includes('/api/clientes')) errores.push(`${r.status()} ${r.url()}`);
        });

        await page.goto('/admin/customers');
        await esperarDatos(page, /@|\d{8}/);
        await page.locator('tbody tr').first().getByRole('button', { name: /Ver detalle/i }).click();
        await page.waitForTimeout(2500);

        expect(errores, 'GET /api/clientes/{id} no debe devolver 4xx').toEqual([]);
    });

    // ── 4. Drawers sin superposición ─────────────────────────────────────
    test('4) los drawers no se superponen', async ({ page }) => {
        await page.goto('/admin/compras/catalogo', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const visibles = await page.locator('div.drawer').evaluateAll(els =>
            els.filter(e => getComputedStyle(e).visibility !== 'hidden').length);
        const enDom = await page.locator('div.drawer').count();
        expect(enDom, 'la pantalla debe tener sus drawers en el DOM').toBeGreaterThan(1);
        expect(visibles, 'al cargar la pantalla NINGÚN drawer debe verse').toBe(0);

        await page.getByRole('button', { name: /Nuevo [ÍI]tem/i }).first().click();
        await page.waitForTimeout(800);
        const trasAbrir = await page.locator('div.drawer').evaluateAll(els =>
            els.filter(e => getComputedStyle(e).visibility !== 'hidden').length);
        expect(trasAbrir, 'con uno abierto sólo debe verse ese').toBe(1);
    });

    // ── 5. Departamento es un select alimentado por una maestra ──────────
    test('5) Departamento es un select con datos de la maestra', async ({ page }) => {
        await page.goto('/admin/compras/solicitudes');
        await page.waitForTimeout(2000);
        await page.getByRole('button', { name: /Nueva Solicitud/i }).first().click();
        await page.waitForTimeout(1000);

        const campo = page.locator('app-server-search-select').filter({ has: page.locator('[formcontrolname="departamento"]') })
            .or(page.locator('app-server-search-select:near(:text("Departamento"))')).first();
        await expect(campo, 'Departamento debe ser un selector, no un input libre').toBeVisible();
        // Ya no debe existir un input de texto suelto con el placeholder viejo.
        await expect(page.getByPlaceholder('Ej: Operaciones'),
            'no debe quedar el input de texto libre').toHaveCount(0);
    });

    // ── 6. Tablero de órdenes con presentación mejorada ──────────────────
    test('6) el tablero de órdenes muestra cabeceras con contador e importe', async ({ page }) => {
        await page.goto('/admin/compras/kanban');
        await page.waitForTimeout(2500);

        const columnas = page.locator('.kanban-column, [class*="kanban-column"]');
        expect(await columnas.count(), 'debe haber columnas de estado').toBeGreaterThan(3);
        const texto = await page.locator('.kanban-board, [class*="kanban"]').first().innerText();
        expect(texto, 'cada columna debe indicar cuántas OC tiene').toMatch(/\d+\s*OC/i);
        expect(texto, 'cada columna debe indicar su importe').toMatch(/S\/|0\.00/);
    });

    // ── 10. Último submenú del sidebar visible ───────────────────────────
    test('10) el último submenú del grupo más largo se ve completo', async ({ page }) => {
        await page.goto('/admin/products');
        await page.waitForTimeout(1500);

        // Compras es el grupo más largo del menú.
        await page.locator('.group-header').filter({ hasText: /^COMPRAS$/i }).first().click();
        await page.waitForTimeout(700);

        const items = page.locator('.group-items-list a');
        const total = await items.count();
        expect(total, 'el grupo debe desplegar sus opciones').toBeGreaterThan(5);

        // El último item debe estar dentro del área visible de su contenedor.
        const ultimo = items.nth(total - 1);
        const recortado = await ultimo.evaluate(el => {
            const lista = el.closest('.group-items-list') as HTMLElement;
            return el.getBoundingClientRect().bottom > lista.getBoundingClientRect().bottom + 1;
        });
        expect(recortado, 'el último submenú no debe quedar cortado por el contenedor').toBe(false);
    });

    // ── 12. Iconos en los botones de Contabilidad ────────────────────────
    test('12) los botones de acción de Asientos Contables muestran su icono', async ({ page }) => {
        await page.goto('/admin/contabilidad/asientos');
        await esperarDatos(page, /ASI-|\d{1,2}\/\d{1,2}\/\d{4}/);

        const acciones = page.locator('tbody tr').first().locator('td').last().locator('button');
        const n = await acciones.count();
        expect(n, 'la fila debe tener botones de acción').toBeGreaterThan(0);

        for (let i = 0; i < n; i++) {
            const tieneIcono = await acciones.nth(i).locator('svg, lucide-icon').count();
            expect(tieneIcono, `el botón de acción ${i + 1} debe tener icono`).toBeGreaterThan(0);
        }
    });

    // ── 13. Layout de Sucursales igual que el resto ──────────────────────
    test('13) Sucursales usa el mismo ancho de contenido que las demás vistas', async ({ page }) => {
        const medir = async (ruta: string) => {
            await page.goto(ruta);
            await page.waitForTimeout(1800);
            return page.locator('h1').first().evaluate(el => Math.round(el.getBoundingClientRect().left));
        };
        const products = await medir('/admin/products');
        const sucursales = await medir('/admin/sucursales');
        expect(Math.abs(products - sucursales),
            `el título debe alinearse igual (products=${products}, sucursales=${sucursales})`).toBeLessThanOrEqual(2);
    });
});
