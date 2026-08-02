import { test, expect, Page } from '@playwright/test';

/**
 * Dos errores de consola que la compilación no ve:
 *
 * - `alertas`: `GET /alertas` devuelve `Page<T>` y `/alertas/no-leidas` una lista, pero el
 *   componente tipaba las dos como array y guardaba el objeto Page entero en la señal. Al
 *   cambiar el filtro a «todas», `noLeidas()` reventaba con
 *   «this.alertas(...).filter is not a function» y la pantalla quedaba inutilizable.
 * - `reportes-kpi`: de los 5 campos que el componente esperaba de `/reportes/kpi/proveedores`, el
 *   backend sólo manda `totalOrdenes`. Los otros cuatro llegaban `undefined`: NG0955 por claves
 *   duplicadas (todas las filas trackeaban el mismo `undefined`), columna Proveedor en blanco,
 *   «S/ » sin importe y la insignia de facturas pendientes clavada en 0.
 */

/** Recoge errores de consola y de red de una pantalla. */
async function revisar(page: Page, ruta: string): Promise<{ consola: string[]; red: string[] }> {
    const consola: string[] = [];
    const red: string[] = [];
    const onConsole = (m: { type(): string; text(): string }) => {
        if (m.type() === 'error') consola.push(m.text().slice(0, 200));
    };
    page.on('console', onConsole);
    page.on('pageerror', e => consola.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on('response', r => { if (r.status() >= 400) red.push(`${r.status()} ${r.url()}`); });

    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    page.off('console', onConsole);
    return { consola, red };
}

test('la pantalla de alertas de compras no rompe al pedir «todas»', async ({ page }) => {
    test.setTimeout(120_000);
    const { consola, red } = await revisar(page, '/admin/compras/alertas');
    console.log('[ALERTAS] consola:', JSON.stringify(consola));
    console.log('[ALERTAS] red:', JSON.stringify(red));

    // El filtro «todas» es el que pega contra el endpoint paginado: ahí estaba el TypeError.
    const todas = page.getByRole('button', { name: /^Todas$/i }).first();
    if (await todas.count() > 0) {
        const errores: string[] = [];
        page.on('pageerror', e => errores.push(String(e)));
        page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
        await todas.click();
        await page.waitForTimeout(3000);
        console.log('[ALERTAS] tras pulsar «Todas»:', JSON.stringify(errores.slice(0, 4)));
        expect(errores.filter(e => /is not a function/i.test(e)),
            'no debe reventar al cargar el listado paginado').toEqual([]);
    }

    expect(consola.filter(e => /is not a function/i.test(e)), 'sin TypeError al montar').toEqual([]);
});

test('reportes KPI no emite NG0955 y su tabla muestra datos reales', async ({ page }) => {
    test.setTimeout(120_000);
    const { consola } = await revisar(page, '/admin/compras/reportes-kpi');
    console.log('[KPI] consola:', JSON.stringify(consola));
    expect(consola.filter(e => /NG0955/.test(e)),
        'no debe haber claves duplicadas en el @for').toEqual([]);

    // Y la columna de proveedor no puede quedar en blanco: era el otro sintoma del contrato roto.
    const filas = page.locator('tbody tr');
    const n = await filas.count();
    console.log('[KPI] filas en Top Proveedores:', n);
    if (n > 0) {
        const primera = (await filas.first().locator('td').first().innerText()).trim();
        console.log('[KPI] primera celda de proveedor:', JSON.stringify(primera));
        expect(primera.length, 'el nombre del proveedor debe venir del backend').toBeGreaterThan(0);
    }
    // Las 5 tarjetas del tablero deben tener su número: «Devoluciones» salía en blanco porque el
    // campo del backend se llama `devoluciones` y el frontend leía `totalDevoluciones`.
    const tarjetas = await page.locator('.card.card-body.text-center').evaluateAll(els => els.map(el => {
        const valor = el.querySelector('div')?.textContent?.trim() ?? '';
        const etiqueta = el.querySelectorAll('div')[1]?.textContent?.trim() ?? '';
        return { etiqueta, valor };
    }));
    console.log('[KPI] tarjetas:', JSON.stringify(tarjetas));
    const vacias = tarjetas.filter(t => t.etiqueta && t.valor === '');
    expect(vacias, 'ninguna tarjeta del tablero debe quedar sin valor').toEqual([]);

    await page.screenshot({ path: '.claude/workspace/screenshots/validacion-reportes-kpi.png' });
});
