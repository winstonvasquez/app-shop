import { test, expect } from '@playwright/test';

/**
 * `picking-mobile` y `notifications` de logística se renderizaban como una columna estrecha
 * centrada (`max-w-2xl mx-auto` / `max-w-3xl mx-auto`) con cabecera escrita a mano, en vez de
 * ocupar el `main` como el resto del ERP. Se comprueba MIDIENDO, no a ojo.
 */

const REFERENCIAS = ['/admin/products', '/admin/logistica/transportistas-sla'];
const CORREGIDAS = ['/admin/logistica/picking-mobile', '/admin/logistica/notificaciones'];

test('las vistas de logística se alinean con el resto del main', async ({ page }) => {
    test.setTimeout(180_000);

    const medir = async (ruta: string) => {
        await page.goto(ruta, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);
        const h1 = page.locator('h1').first();
        await expect(h1, `${ruta} debe tener un título`).toBeVisible({ timeout: 15_000 });
        return h1.evaluate(el => Math.round(el.getBoundingClientRect().left));
    };

    const izquierdas: Record<string, number> = {};
    for (const r of [...REFERENCIAS, ...CORREGIDAS]) izquierdas[r] = await medir(r);
    console.log('[LAYOUT] left del h1 por ruta:', JSON.stringify(izquierdas, null, 1));

    const base = izquierdas[REFERENCIAS[0]];
    for (const r of CORREGIDAS) {
        expect(Math.abs(izquierdas[r] - base),
            `${r} debe alinearse con ${REFERENCIAS[0]} (${izquierdas[r]} vs ${base})`).toBeLessThanOrEqual(2);
    }
    // Y ya no debe quedar el contenedor estrecho centrado que las descolocaba.
    for (const r of CORREGIDAS) {
        await page.goto(r, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        const estrechos = await page.locator('.max-w-2xl.mx-auto, .max-w-3xl.mx-auto').count();
        console.log(`[LAYOUT] ${r}: contenedores estrechos centrados = ${estrechos}`);
        expect(estrechos, `${r} no debe centrar su contenido en una columna estrecha`).toBe(0);
        await page.screenshot({ path: `.claude/workspace/screenshots/layout-${r.split('/').pop()}.png` });
    }
});
