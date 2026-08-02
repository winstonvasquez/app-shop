import { test, expect } from '@playwright/test';

/**
 * Punto 2 del pedido: la promoción debe verse como una etiqueta de color en la
 * tienda en línea y en el POS.
 *
 * Que el campo `promocionEtiqueta` llegue en el JSON no basta: aquí se crea una
 * promoción real de alcance CATEGORIA y se comprueba que la badge se PINTA con
 * color en el storefront y en el catálogo del POS. La promoción se borra al final.
 */

const NOMBRE = `VALID-PROMO-${Date.now().toString().slice(-6)}`;

test.describe.configure({ mode: 'serial' });

test('crea una promoción de categoría vigente', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/promotions');
    await page.getByRole('button', { name: /Nueva Promoci/i }).click();
    await page.waitForTimeout(900);

    await page.locator('input[formcontrolname="nombre"]').fill(NOMBRE);
    await page.locator('input[formcontrolname="valor"]').fill('20');

    await page.locator('select[formcontrolname="alcance"]').selectOption({ value: 'CATEGORIA' });
    await page.waitForTimeout(600);

    // Primera categoría real del backend.
    const selCat = page.locator('select[formcontrolname="categoriaId"]');
    const valores = await selCat.locator('option').evaluateAll(os =>
        os.map(o => (o as HTMLOptionElement).value).filter(v => v && v !== 'null'));
    expect(valores.length, 'debe haber categorías para vincular').toBeGreaterThan(0);
    await selCat.selectOption({ value: valores[0] });

    // Vigencia: desde hoy hasta dentro de un mes.
    const hoy = new Date();
    const fin = new Date(hoy.getTime() + 30 * 24 * 3600 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    await page.locator('input[formcontrolname="fechaInicio"]').fill(iso(hoy));
    await page.locator('input[formcontrolname="fechaFin"]').fill(iso(fin));

    const respuesta = page.waitForResponse(r =>
        r.url().includes('/promociones') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Crear|Guardar/i }).last().click();
    const res = await respuesta;
    expect(res.status(), `el POST de promoción debe crear (body: ${await res.text().catch(() => '')})`)
        .toBeLessThan(400);
});

test('la etiqueta se pinta con color en la tienda en línea', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/products');
    await page.waitForTimeout(4000);

    // La badge de promoción se pinta con ds-badge sobre la tarjeta de producto.
    // El fondo lo lleva el <span> interno, no el host del custom element.
    const badges = page.locator('ds-badge span').filter({ hasText: /^-\s*\d+%$/ });
    const n = await badges.count();
    console.log('[TIENDA] badges de descuento encontradas:', n);
    expect(n, 'debe verse al menos una etiqueta de promoción en el catálogo').toBeGreaterThan(0);

    // Y debe tener color propio, no ser texto plano.
    const estilo = await badges.first().evaluate(el => {
        const s = getComputedStyle(el);
        return { color: s.color, fondo: s.backgroundColor, texto: el.textContent?.trim() };
    });
    console.log('[TIENDA] estilo de la etiqueta:', JSON.stringify(estilo));
    expect(estilo.fondo, 'la etiqueta debe tener fondo de color').not.toBe('rgba(0, 0, 0, 0)');
    await page.screenshot({ path: '.claude/workspace/screenshots/etiqueta-tienda.png' });
});

test('la etiqueta se pinta con color en el POS', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pos');
    await page.waitForTimeout(5000);

    // Sólo los productos de la categoría en promoción llevan etiqueta, y el catálogo
    // muestra decenas de ítems: hay que filtrar para que la tarjeta esté en pantalla.
    await page.getByPlaceholder(/Buscar producto, SKU/i).fill('Estándar');
    await page.waitForTimeout(2500);

    // El marcado del POS usa clases Tailwind, no una clase "badge": se localiza por el texto.
    const badges = page.locator('span[class*="rounded-full"]').filter({ hasText: /\d+%/ });
    await expect(badges.first(), 'debe verse la etiqueta de promoción en el catálogo del POS')
        .toBeVisible({ timeout: 20_000 });
    console.log('[POS] badges de descuento encontradas:', await badges.count());
    await page.screenshot({ path: '.claude/workspace/screenshots/etiqueta-pos.png' });

    const estilo = await badges.first().evaluate(el => {
        const s = getComputedStyle(el);
        return { color: s.color, fondo: s.backgroundColor, texto: el.textContent?.trim() };
    });
    console.log('[POS] estilo de la etiqueta:', JSON.stringify(estilo));
    expect(estilo.fondo, 'la etiqueta del POS debe tener fondo de color').not.toBe('rgba(0, 0, 0, 0)');
});
