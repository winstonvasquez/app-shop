import { test, expect, Page } from '@playwright/test';

/**
 * `routerLinkActive` casa por PREFIJO, así que en tres pares de rutas del menú una es prefijo de
 * la otra y las DOS quedaban resaltadas a la vez:
 *   /admin/rrhh/evaluations  ⊂  /admin/rrhh/evaluations/criteria
 *   /admin/customers         ⊂  /admin/customers/dashboard
 *   /pos                     ⊂  /pos/devoluciones
 *
 * `{ exact: true }` tampoco servía: dejaría «Clientes» sin resaltar al abrir el detalle de un
 * cliente, que no es una entrada de menú. La regla es el prefijo MÁS LARGO que casa.
 */

/** Etiquetas de las entradas del menú que aparecen resaltadas ahora mismo. */
async function activas(page: Page): Promise<string[]> {
    return page.locator('.group-items-list a.active-nav-item, .group-items-list a .active-nav-item')
        .evaluateAll(els => els.map(e => (e.textContent ?? '').trim()).filter(Boolean));
}

/**
 * Asegura que el grupo esté desplegado. Ojo: el sidebar YA lo auto-expande según la ruta activa,
 * así que pulsar sin comprobarlo lo CIERRA y deja 0 items en el DOM — con eso el test daba
 * «0 resaltadas» y parecía que el arreglo no funcionaba.
 */
async function abrirGrupo(page: Page, grupo: RegExp): Promise<void> {
    const items = page.locator('.group-items-list a');
    if (await items.count() > 0) return;
    const cabecera = page.locator('.group-header').filter({ hasText: grupo }).first();
    if (await cabecera.count() === 0) return;
    await cabecera.click();
    await page.waitForTimeout(700);
}

const CASOS: Array<{ ruta: string; grupo: RegExp; esperada: RegExp; nombre: string }> = [
    { nombre: 'RRHH / Evaluaciones',           ruta: '/admin/rrhh/evaluations',          grupo: /^RRHH$/i,     esperada: /^Evaluaciones$/ },
    { nombre: 'RRHH / Criterios',              ruta: '/admin/rrhh/evaluations/criteria', grupo: /^RRHH$/i,     esperada: /^Criterios de Evaluaci/ },
    { nombre: 'Ventas / Clientes',             ruta: '/admin/customers',                 grupo: /^VENTAS$/i,   esperada: /^Clientes$/ },
];

for (const { nombre, ruta, grupo, esperada } of CASOS) {
    test(`en ${nombre} sólo se resalta una entrada del menú`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.goto(ruta, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);
        await abrirGrupo(page, grupo);

        const marcadas = await activas(page);
        console.log(`[MENU] ${ruta} -> resaltadas: ${JSON.stringify(marcadas)}`);
        expect(marcadas.length, `debe haber exactamente 1 entrada resaltada, no ${marcadas.length}`).toBe(1);
        expect(marcadas[0], 'y debe ser la de la ruta actual').toMatch(esperada);
    });
}

test('el detalle de un cliente sigue resaltando «Clientes»', async ({ page }) => {
    test.setTimeout(120_000);
    // Una URL hija que NO es entrada de menú: con { exact: true } se habria quedado sin resaltar.
    await page.goto('/admin/customers/2', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await abrirGrupo(page, /^VENTAS$/i);
    const marcadas = await activas(page);
    console.log(`[MENU] /admin/customers/2 -> resaltadas: ${JSON.stringify(marcadas)}`);
    expect(marcadas, 'una ruta hija debe seguir resaltando su entrada de menú').toEqual(['Clientes']);
});
