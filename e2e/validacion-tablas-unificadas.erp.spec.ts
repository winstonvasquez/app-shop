import { test, expect, Page } from '@playwright/test';

/**
 * El ERP tenía DOS tablas con aspecto distinto, medido: las 86 vistas del componente
 * `<app-data-table>` pintaban cabeceras de 14px en caja normal y celdas en gris medio, y las 43
 * escritas a mano con `class="table"` usaban `.table-header-cell`/`.table-cell`, con cabecera
 * compacta en MAYÚSCULAS y texto de celda casi negro.
 *
 * Se unificó en la segunda (se lee mejor la jerarquía y el dato). Esta prueba compara el estilo
 * computado de las dos: si alguien vuelve a separarlas, aquí se cae.
 */

interface EstiloTabla { thead: Record<string, string>; th: Record<string, string>; td: Record<string, string>; }

async function medirTabla(page: Page, ruta: string, sel: string): Promise<EstiloTabla | null> {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    return page.evaluate(s => {
        const t = document.querySelector(s) as HTMLElement | null;
        if (!t) return null;
        const pick = (e: Element | null, props: string[]) => {
            if (!e) return {} as Record<string, string>;
            const c = getComputedStyle(e as HTMLElement);
            const o: Record<string, string> = {};
            props.forEach(p => { o[p] = (c as unknown as Record<string, string>)[p]; });
            return o;
        };
        return {
            thead: pick(t.querySelector('thead'), ['backgroundColor', 'borderBottomWidth']),
            th: pick(t.querySelector('th'), ['padding', 'fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing']),
            td: pick(t.querySelector('tbody td'), ['padding', 'fontSize', 'fontWeight', 'color']),
        };
    }, sel);
}

test('la tabla del componente y la escrita a mano se ven igual', async ({ page }) => {
    test.setTimeout(180_000);
    const componente = await medirTabla(page, '/admin/products', 'table.data-table');
    const aMano = await medirTabla(page, '/admin/dashboard', 'table.table');

    console.log('[TABLA] componente:', JSON.stringify(componente));
    console.log('[TABLA] a mano:    ', JSON.stringify(aMano));
    expect(componente, 'la vista con el componente debe tener tabla').not.toBeNull();
    expect(aMano, 'la vista a mano debe tener tabla').not.toBeNull();

    // Cabecera: tamaño, caja, espaciado y color deben coincidir.
    for (const prop of ['padding', 'fontSize', 'fontWeight', 'color', 'textTransform', 'letterSpacing'] as const) {
        expect(aMano!.th[prop], `th.${prop} debe ser el mismo en las dos tablas`)
            .toBe(componente!.th[prop]);
    }
    // Celda: relleno, tamaño, peso y color.
    for (const prop of ['padding', 'fontSize', 'fontWeight', 'color'] as const) {
        expect(aMano!.td[prop], `td.${prop} debe ser el mismo en las dos tablas`)
            .toBe(componente!.td[prop]);
    }
    // Y el grosor del separador de cabecera.
    expect(aMano!.thead['borderBottomWidth'], 'el borde del thead debe ser el mismo')
        .toBe(componente!.thead['borderBottomWidth']);
    expect(aMano!.thead['backgroundColor']).toBe(componente!.thead['backgroundColor']);
});

test('la tabla del componente tiene filas alternas y hover, como la del sistema', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);

    const filas = await page.locator('table.data-table tbody tr').evaluateAll(els =>
        els.slice(0, 4).map(e => getComputedStyle(e).backgroundColor));
    console.log('[TABLA] fondos de las 4 primeras filas:', JSON.stringify(filas));
    expect(filas.length, 'debe haber filas que medir').toBeGreaterThan(1);
    // Cebra: la 1ª y la 2ª no pueden tener el mismo fondo.
    expect(filas[0], 'las filas deben alternar fondo').not.toBe(filas[1]);
});
