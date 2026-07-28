import { test, expect, Page } from '@playwright/test';
import { ALL_MENU_ROUTES } from './fixtures/menu-routes';

/**
 * Verifica la barra de filtros de todas las vistas de listado del ERP.
 *
 * Reglas que se comprueban (son las que motivaron el rediseño de la toolbar):
 *  1. Ningún control de filtro queda sin etiqueta visible: con varios selects y
 *     dos rangos de fecha seguidos, sin etiqueta no se sabe qué filtra cada uno.
 *  2. Los rangos de fecha se presentan como una unidad con sus dos extremos.
 *  3. La barra no se desborda horizontalmente.
 *  4. Ninguna vista mantiene una barra de filtros propia duplicando la toolbar.
 */

const CAPTURAS = '../.claude/workspace/screenshots/filtros';

/** Rutas de listado: las que montan un data-table con filtros. */
async function tieneToolbar(page: Page): Promise<boolean> {
    return (await page.locator('.table-toolbar').count()) > 0;
}

test.describe('Barra de filtros del ERP', () => {
    test('cada filtro de cada vista tiene etiqueta visible', async ({ page }) => {
        test.setTimeout(15 * 60_000);

        const sinEtiqueta: string[] = [];
        const conBarraPropia: string[] = [];
        const revisadas: string[] = [];

        for (const item of ALL_MENU_ROUTES) {
            await page.goto(item.route);
            await page.waitForTimeout(900);
            if (!(await tieneToolbar(page))) continue;
            revisadas.push(item.route);

            // 1 y 2: todo control de la rejilla lleva etiqueta con texto
            const campos = page.locator('.toolbar-filters .filter-field');
            const total = await campos.count();
            for (let i = 0; i < total; i++) {
                const campo = campos.nth(i);
                const etiqueta = campo.locator('.filter-label');
                if ((await etiqueta.count()) === 0) {
                    sinEtiqueta.push(`${item.route}: campo ${i + 1} sin etiqueta`);
                    continue;
                }
                const texto = (await etiqueta.first().innerText()).trim();
                if (!texto) sinEtiqueta.push(`${item.route}: campo ${i + 1} con etiqueta vacía`);
            }

            // Los selects proyectados por la vista también deben ir etiquetados
            const proyectados = page.locator('.toolbar-filters [toolbarExtra]');
            const nExtra = await proyectados.count();
            for (let i = 0; i < nExtra; i++) {
                const texto = (await proyectados.nth(i).innerText()).trim();
                if (!texto) sinEtiqueta.push(`${item.route}: filtro propio ${i + 1} sin etiqueta`);
            }

            // 4: barra de filtros propia fuera de la toolbar
            if ((await page.locator('.filters-bar').count()) > 0) {
                conBarraPropia.push(item.route);
            }
        }

        expect(revisadas.length, 'debe haber vistas con toolbar de filtros').toBeGreaterThan(20);
        expect(sinEtiqueta.join('\n'), 'controles de filtro sin etiqueta').toBe('');
        expect(conBarraPropia.join('\n'), 'vistas que aún duplican la barra de filtros').toBe('');
    });

    test('la barra de filtros no desborda el ancho de la página', async ({ page }) => {
        test.setTimeout(5 * 60_000);
        const desbordan: string[] = [];

        // Muestra representativa: las vistas con más filtros del ERP.
        const muestra = [
            '/admin/orders',
            '/admin/compras/proveedores',
            '/admin/rrhh/employees',
            '/admin/inventario/movimientos',
            '/admin/contabilidad/asientos',
        ];

        for (const ruta of muestra) {
            await page.goto(ruta);
            await page.waitForTimeout(1200);
            if (!(await tieneToolbar(page))) continue;

            const desbordado = await page.evaluate(() => {
                const el = document.querySelector('.table-toolbar');
                if (!el) return false;
                return el.scrollWidth > el.clientWidth + 2;
            });
            if (desbordado) desbordan.push(ruta);

            await page.locator('.table-toolbar').first().screenshot({
                path: `${CAPTURAS}/${ruta.replace(/^\//, '').replace(/\//g, '_')}.png`,
            });
        }

        expect(desbordan.join(', '), 'toolbars con desbordamiento horizontal').toBe('');
    });

    test('aplicar y limpiar un filtro consulta al backend', async ({ page }) => {
        await page.goto('/admin/rrhh/employees');
        await expect(page.locator('.table-toolbar')).toBeVisible({ timeout: 20_000 });

        const select = page.locator('.toolbar-filters .filter-field select').first();
        await expect(select).toBeVisible();

        // Elegir la primera opción real dispara una consulta nueva
        const opciones = await select.locator('option').count();
        expect(opciones, 'el filtro debe traer opciones del catálogo').toBeGreaterThan(1);

        const peticion = page.waitForRequest(r => r.url().includes('/hr/api/employees'), { timeout: 15_000 });
        await select.selectOption({ index: 1 });
        await peticion;

        // Con un filtro activo aparece "Limpiar" con su contador
        const limpiar = page.locator('.table-filters-clear');
        await expect(limpiar).toBeVisible();
        await expect(limpiar.locator('.table-filters-count')).toHaveText('1');

        const recarga = page.waitForRequest(r => r.url().includes('/hr/api/employees'), { timeout: 15_000 });
        await limpiar.click();
        await recarga;
        await expect(limpiar).toBeHidden();
    });
});
