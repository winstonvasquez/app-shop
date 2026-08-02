import { test, expect, Page } from '@playwright/test';

/**
 * El reset universal de `.pos-layout` estaba fuera de toda `@layer`, y por la especificación de
 * cascade layers el CSS sin capa gana siempre al CSS con capa: eso anulaba TODAS las utilities de
 * margen/padding de Tailwind dentro del POS salvo que llevaran `!`. Al meterlo en `@layer base`
 * las utilities vuelven a aplicar — y ahí está el riesgo: los espaciados que estaban silenciados
 * reaparecen y pueden duplicarse con el padding ya declarado en SCSS.
 *
 * Estas pruebas comprueban lo que de verdad importa: que nada quede recortado ni desborde.
 */

/** Elementos que sobresalen del viewport por abajo o por la derecha. */
async function desbordes(page: Page): Promise<Array<{ sel: string; bottom: number; right: number }>> {
    return page.evaluate(() => {
        const vh = window.innerHeight, vw = window.innerWidth;
        const fuera: Array<{ sel: string; bottom: number; right: number }> = [];
        document.querySelectorAll('.pos-layout button, .pos-layout .card, .pos-layout table, .pos-layout h1, .pos-layout h2, .pos-layout h3')
            .forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return;           // oculto: no cuenta
                if (getComputedStyle(el).position === 'fixed') return; // barras fijas: por diseño
                // Contenido dentro de un contenedor que scrollea por diseño (el carrusel de
                // categorías, tablas anchas) no es un desborde: es lo que manda la convención
                // del proyecto. Sólo cuenta si NINGÚN ancestro puede desplazarlo.
                let a: HTMLElement | null = el.parentElement;
                while (a && a !== document.body) {
                    const s = getComputedStyle(a);
                    if (/auto|scroll/.test(s.overflowX) || /auto|scroll/.test(s.overflowY)) return;
                    a = a.parentElement;
                }
                if (r.bottom > vh + 2 || r.right > vw + 2) {
                    const sel = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`;
                    fuera.push({ sel, bottom: Math.round(r.bottom - vh), right: Math.round(r.right - vw) });
                }
            });
        return fuera;
    });
}

const PANTALLAS: Array<{ nombre: string; abrir: (p: Page) => Promise<void> }> = [
    { nombre: 'catálogo', abrir: async p => { await p.goto('/pos'); } },
    { nombre: 'devoluciones', abrir: async p => { await p.goto('/pos/devoluciones'); } },
    { nombre: 'historial', abrir: async p => { await p.goto('/pos'); await p.getByRole('button', { name: /Historial/i }).first().click(); } },
    { nombre: 'turno', abrir: async p => { await p.goto('/pos'); await p.getByRole('button', { name: /Mi Turno/i }).first().click(); } },
];

for (const { nombre, abrir } of PANTALLAS) {
    test(`la pantalla «${nombre}» del POS no desborda el viewport`, async ({ page }) => {
        test.setTimeout(120_000);
        await abrir(page);
        await page.waitForTimeout(4500);
        const fuera = await desbordes(page);
        console.log(`[${nombre}] elementos desbordados: ${fuera.length}`, JSON.stringify(fuera.slice(0, 6)));
        expect(fuera, `nada debe salirse del viewport en «${nombre}»`).toEqual([]);

        // Y la página en sí no debe poder desplazarse en horizontal.
        const scrollH = await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth);
        console.log(`[${nombre}] scroll horizontal de la página: ${scrollH}px`);
        expect(scrollH, `«${nombre}» no debe scrollear en horizontal`).toBeLessThanOrEqual(2);
        await page.screenshot({ path: `.claude/workspace/screenshots/validacion-pos-${nombre}.png` });
    });
}

test('los campos del POS tienen borde visible sobre fondo claro', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pos');
    await page.waitForTimeout(4500);
    await page.locator('body').click({ position: { x: 5, y: 400 } }); // sin foco
    await page.waitForTimeout(400);

    const campos = await page.locator('.input-field').evaluateAll(els => els.slice(0, 6).map(el => {
        const s = getComputedStyle(el);
        return { borde: s.borderColor, fondo: s.backgroundColor };
    }));
    console.log('[BORDES]', JSON.stringify(campos));
    expect(campos.length, 'debe haber campos que medir').toBeGreaterThan(0);
    for (const c of campos) {
        // El defecto era un borde blanco al 10% sobre fondo casi blanco: invisible.
        expect(c.borde, `el borde no puede ser blanco translúcido (${JSON.stringify(c)})`)
            .not.toMatch(/rgba\(255,\s*255,\s*255/);
    }
});

test('las utilities de Tailwind vuelven a aplicar dentro del POS', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pos');
    await page.waitForTimeout(4500);

    // Se inyecta un elemento de prueba con una utility SIN `!` y se comprueba que el
    // reset universal ya no la anula. Es la comprobación directa del arreglo de capas.
    const medido = await page.evaluate(() => {
        const layout = document.querySelector('.pos-layout');
        if (!layout) return null;
        const d = document.createElement('div');
        d.className = 'px-4 mb-5';
        layout.appendChild(d);
        const s = getComputedStyle(d);
        const r = { paddingLeft: s.paddingLeft, marginBottom: s.marginBottom };
        d.remove();
        return r;
    });
    console.log('[UTILITIES]', JSON.stringify(medido));
    expect(medido, 'debe existir .pos-layout').not.toBeNull();
    expect(medido!.paddingLeft, 'px-4 debe aplicar dentro del POS').not.toBe('0px');
    expect(medido!.marginBottom, 'mb-5 debe aplicar dentro del POS').not.toBe('0px');
});
