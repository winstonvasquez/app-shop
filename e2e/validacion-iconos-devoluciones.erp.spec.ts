import { test, expect } from '@playwright/test';

/**
 * Los dos últimos pedidos del usuario, verificados por mí y no por el agente que los
 * implementó: los iconos del gestor de footer deben verse, y /pos/devoluciones debe
 * seguir el estándar del resto del POS.
 */

test('los iconos de eliminar del gestor de footer se ven', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/admin/footer-manager');
    await page.waitForTimeout(3500);

    const iconos = page.locator('button svg, button lucide-icon svg');
    const n = await iconos.count();
    expect(n, 'la pantalla debe tener botones con icono').toBeGreaterThan(0);

    // Ninguno puede tener ancho o alto 0: ése era el defecto (recuadro vacío).
    const colapsados = await iconos.evaluateAll(els => els
        .map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter(d => d.w === 0 || d.h === 0));
    console.log(`[FOOTER] iconos: ${n} | colapsados: ${colapsados.length}`, JSON.stringify(colapsados.slice(0, 5)));
    expect(colapsados.length, 'ningún icono debe colapsar a 0px').toBe(0);

    // El botón de agregar no debe solaparse con el título de su columna.
    const solapes = await page.locator('.card-header').evaluateAll(hs => hs.filter(h => {
        const t = h.querySelector('h2,h3,.card-title');
        const b = h.querySelector('button');
        if (!t || !b) return false;
        const a = t.getBoundingClientRect(), c = b.getBoundingClientRect();
        return a.right > c.left + 1 && a.left < c.right - 1 && a.bottom > c.top + 1 && a.top < c.bottom - 1;
    }).length);
    expect(solapes, 'el botón de agregar no debe solapar el título de la columna').toBe(0);

    await page.screenshot({ path: '.claude/workspace/screenshots/validacion-footer-manager.png' });
});

test('/pos/devoluciones se presenta con el shell del POS, igual que /pos', async ({ page }) => {
    test.setTimeout(90_000);
    const errores: string[] = [];
    page.on('response', r => {
        if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`);
    });

    // Referencia: margen del contenido en la pantalla principal del POS.
    await page.goto('/pos');
    await page.waitForTimeout(4000);
    const xMain = await page.locator('.pos-content').first()
        .evaluate(el => Math.round(el.getBoundingClientRect().x));

    await page.goto('/pos/devoluciones');
    await page.waitForTimeout(4000);

    await expect(page.locator('.pos-layout'), 'debe montar el shell del POS').toBeVisible();
    await expect(page.locator('.pos-sidenav'), 'debe verse el sidenav del POS').toBeVisible();
    const xDev = await page.locator('.pos-content').first()
        .evaluate(el => Math.round(el.getBoundingClientRect().x));
    console.log(`[POS-DEV] x main=${xMain} devoluciones=${xDev}`);
    expect(Math.abs(xMain - xDev), 'el contenido debe alinearse igual que en /pos').toBeLessThanOrEqual(2);

    // Y la screen activa debe ser Devoluciones, no el catálogo.
    await expect(page.getByText(/Devoluciones/i).first()).toBeVisible();
    expect(errores, 'ningún endpoint debe responder 5xx').toEqual([]);

    await page.screenshot({ path: '.claude/workspace/screenshots/validacion-pos-devoluciones.png' });
});
