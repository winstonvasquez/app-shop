import { test, expect } from '@playwright/test';

/**
 * Dos vistas que el usuario reportó: Batch Picking no seguía el layout del ERP, y en Análisis ABC
 * las cantidades iban como texto corrido en vez de insignias.
 */

test('Batch Picking se alinea con el resto del main y no tiene errores', async ({ page }) => {
    test.setTimeout(150_000);
    const fallos: string[] = [];
    page.on('response', r => { if (r.status() >= 500) fallos.push(`${r.status()} ${r.url()}`); });

    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    const base = await page.locator('h1').first().evaluate(el => Math.round(el.getBoundingClientRect().left));

    await page.goto('/admin/logistica/batch-picking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const x = await page.locator('h1').first().evaluate(el => Math.round(el.getBoundingClientRect().left));
    console.log(`[BATCH] left del h1: products=${base} batch-picking=${x}`);
    expect(Math.abs(x - base), 'el título debe alinearse con el resto del main').toBeLessThanOrEqual(2);

    // El «Actualizar» era un enlace de texto azul; ahora debe ser un botón del sistema.
    const actualizar = page.getByRole('button', { name: /Actualizar/i }).first();
    await expect(actualizar, '«Actualizar» debe ser un botón, no un enlace').toBeVisible();

    console.log('[BATCH] respuestas 5xx:', JSON.stringify(fallos));
    expect(fallos, 'ningún endpoint debe responder 5xx').toEqual([]);
    await page.screenshot({ path: '.claude/workspace/screenshots/validacion-batch-picking.png' });
});

test('Análisis ABC muestra las cantidades en insignias con color', async ({ page }) => {
    test.setTimeout(150_000);
    const fallos: string[] = [];
    page.on('response', r => { if (r.status() >= 500) fallos.push(`${r.status()} ${r.url()}`); });

    await page.goto('/admin/inventario/abc', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('[ABC] respuestas 5xx:', JSON.stringify(fallos));
    expect(fallos, 'el endpoint del ABC debe responder (el 500 anterior era el servicio caído)').toEqual([]);

    // Insignias del resumen por clase. Se mide el fondo del elemento que de verdad lo lleva.
    const insignias = await page.locator('.badge').evaluateAll(els => els.map(el => ({
        texto: (el.textContent ?? '').trim().slice(0, 12),
        fondo: getComputedStyle(el).backgroundColor,
    })));
    console.log('[ABC] insignias:', JSON.stringify(insignias.slice(0, 8)));
    expect(insignias.length, 'debe haber insignias en la pantalla').toBeGreaterThan(0);

    const sinColor = insignias.filter(b => b.fondo === 'rgba(0, 0, 0, 0)');
    expect(sinColor, 'toda insignia debe tener fondo propio').toEqual([]);

    await page.screenshot({ path: '.claude/workspace/screenshots/validacion-abc.png' });
});

/**
 * El estado vacío del data-table compartido salía apretado en la PRIMERA columna: su clase
 * `.empty-state` colisiona con la del sistema de diseño, que es `display: flex` (pensada para un
 * div), y un `<td>` en flex deja de ser celda y pierde el `colspan`. Afectaba a toda tabla vacía
 * del ERP, no a una vista.
 */
test('el estado vacío de cualquier tabla ocupa el ancho completo', async ({ page }) => {
    test.setTimeout(150_000);
    for (const ruta of ['/admin/logistica/batch-picking', '/admin/inventario/abc']) {
        await page.goto(ruta, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        const medida = await page.evaluate(() => {
            const celda = [...document.querySelectorAll('td')]
                .find(td => /No hay datos|Sin datos/i.test(td.textContent ?? ''));
            if (!celda) return null;
            const r = celda.getBoundingClientRect();
            const t = celda.closest('table')!.getBoundingClientRect();
            return { display: getComputedStyle(celda).display, celda: Math.round(r.width), tabla: Math.round(t.width) };
        });
        console.log(`[VACIO] ${ruta} ->`, JSON.stringify(medida));
        if (!medida) continue;  // con datos reales no hay estado vacio que medir
        expect(medida.display, `en ${ruta} la celda debe seguir siendo celda de tabla`).toBe('table-cell');
        expect(Math.abs(medida.celda - medida.tabla),
            `en ${ruta} el mensaje debe ocupar el ancho de la tabla`).toBeLessThanOrEqual(2);
    }
});
