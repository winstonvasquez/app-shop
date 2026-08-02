import { test, expect, Page } from '@playwright/test';

/**
 * Decisión de diseño: TODOS los drawers del ERP miden lo mismo que el de «Nuevo Producto»
 * (760px), heredado de un único estilo base (`.drawer` en `_admin-utilities.scss`).
 *
 * Antes había tres anchos conviviendo —de los 78 `<app-drawer>`, 41 en `lg`, 29 en `md` y 7 en
 * `sm`— y además los 15 drawers escritos a mano no declaraban ninguna clase de tamaño, así que
 * al ser `position: fixed` se encogían a su contenido: en `compras/config-aprobaciones` eso daba
 * una tira vertical de un carácter. Tres tenían el ancho puesto en línea (560, 480 y 420 px).
 */

const ANCHO_ESTANDAR = 760;

async function medirDrawer(page: Page, ruta: string, boton: RegExp): Promise<{ ancho: number; visible: boolean }> {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: boton }).first().click();
    await page.waitForTimeout(1200);
    // Dos marcados conviven: el componente compartido emite `<aside class="drawer …">` SIN la clase
    // `.open` (sólo existe en el DOM mientras está abierto), y los escritos a mano son
    // `<div class="drawer … open">`. La regla global anti-solape apunta sólo a `div.drawer`, que es
    // por lo que los `<aside>` nunca la necesitaron.
    const panel = page.locator('aside.drawer:visible, div.drawer.open').first();
    await expect(panel, `debe abrirse un drawer en ${ruta}`).toBeVisible({ timeout: 10_000 });
    return panel.evaluate(el => ({
        ancho: Math.round(el.getBoundingClientRect().width),
        visible: getComputedStyle(el).visibility !== 'hidden',
    }));
}

const PANTALLAS: Array<{ ruta: string; boton: RegExp; nombre: string }> = [
    // La referencia que fijó el estándar.
    { nombre: 'ventas/nuevo producto',         ruta: '/admin/products',                    boton: /Nuevo Producto/i },
    // Los escritos a mano de compras: ninguno declaraba ancho.
    { nombre: 'compras/niveles de aprobación', ruta: '/admin/compras/config-aprobaciones', boton: /Agregar Nivel/i },
    { nombre: 'compras/evaluaciones',          ruta: '/admin/compras/evaluaciones',        boton: /Nueva Evaluaci/i },
    { nombre: 'compras/catálogo',              ruta: '/admin/compras/catalogo',            boton: /Nuevo [ÍI]tem/i },
    { nombre: 'compras/contratos',             ruta: '/admin/compras/contratos',           boton: /Nuevo Contrato/i },
    { nombre: 'compras/presupuestos',          ruta: '/admin/compras/presupuestos',        boton: /Nuevo Presupuesto/i },
    { nombre: 'compras/puntos de reorden',     ruta: '/admin/compras/puntos-reorden',      boton: /^Nuevo$/i },
    { nombre: 'compras/consolidaciones',       ruta: '/admin/compras/consolidaciones',     boton: /Nueva Consolidaci|Nueva/i },
    // Y uno que declaraba `size="sm"` (380px), para comprobar que ya no desalinea.
    { nombre: 'ventas/clientes',               ruta: '/admin/customers',                   boton: /Nuevo Cliente/i },
];

for (const { nombre, ruta, boton } of PANTALLAS) {
    test(`el drawer de «${nombre}» usa el ancho estándar`, async ({ page }) => {
        test.setTimeout(120_000);
        const { ancho, visible } = await medirDrawer(page, ruta, boton);
        console.log(`[DRAWER] ${nombre}: ancho=${ancho}px visible=${visible}`);
        expect(visible, 'el drawer debe verse').toBe(true);
        expect(ancho, `el ancho debe ser el estándar de ${ANCHO_ESTANDAR}px, no ${ancho}px`)
            .toBe(ANCHO_ESTANDAR);
    });
}
