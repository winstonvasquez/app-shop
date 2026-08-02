import { test, expect, Page } from '@playwright/test';

/**
 * El ERP tenía DOS cabeceras visualmente distintas: 61 vistas con `<app-page-header>` (que emite
 * `.ph-root`) y 58 escritas a mano con `class="page-header"`. Además `.page-title` y
 * `.page-subtitle` estaban definidas dos veces —en el sistema de diseño y otra vez dentro del
 * componente— con valores distintos, así que el subtítulo salía de un color en media aplicación
 * y de otro en la otra mitad.
 *
 * Ahora la definición es única. Esta prueba lo comprueba MIDIENDO el estilo computado en vistas
 * de los dos tipos: si alguien vuelve a duplicar la definición, aquí se cae.
 */

interface EstiloCabecera {
    tituloColor: string; tituloTam: string; tituloEspaciado: string; tituloAltura: string;
    subColor: string; subTam: string; subPeso: string;
    acento: boolean;
}

async function medirCabecera(page: Page, ruta: string): Promise<EstiloCabecera | null> {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    return page.evaluate(() => {
        const titulo = document.querySelector('.page-title') as HTMLElement | null;
        if (!titulo) return null;
        const sub = document.querySelector('.page-subtitle') as HTMLElement | null;
        const st = getComputedStyle(titulo);
        const ss = sub ? getComputedStyle(sub) : null;
        // La barra de acento es un ::before de 3px sobre el grupo del título.
        const grupo = titulo.closest('.ph-title-group') ?? titulo.parentElement!;
        const antes = getComputedStyle(grupo, '::before');
        return {
            tituloColor: st.color, tituloTam: st.fontSize,
            tituloEspaciado: st.letterSpacing, tituloAltura: st.lineHeight,
            subColor: ss?.color ?? '(sin subtítulo)', subTam: ss?.fontSize ?? '-',
            subPeso: ss?.fontWeight ?? '-',
            acento: antes.content !== 'none' && antes.width === '3px',
        };
    });
}

test('las dos clases de cabecera del ERP se ven idénticas', async ({ page }) => {
    test.setTimeout(180_000);

    // Vista con el componente compartido.
    const conComponente = await medirCabecera(page, '/admin/logistica/batch-picking');
    // Vista con la cabecera escrita a mano.
    const aMano = await medirCabecera(page, '/admin/contabilidad/plan-cuentas');

    console.log('[CABECERA] con <app-page-header>:', JSON.stringify(conComponente));
    console.log('[CABECERA] escrita a mano:       ', JSON.stringify(aMano));

    expect(conComponente, 'la vista de referencia debe tener cabecera').not.toBeNull();
    expect(aMano, 'la vista a mano debe tener cabecera').not.toBeNull();

    // Tipografía: debe salir de UNA sola definición.
    expect(aMano!.tituloColor).toBe(conComponente!.tituloColor);
    expect(aMano!.tituloTam).toBe(conComponente!.tituloTam);
    expect(aMano!.tituloEspaciado).toBe(conComponente!.tituloEspaciado);
    expect(aMano!.tituloAltura).toBe(conComponente!.tituloAltura);
    expect(aMano!.subColor, 'el subtítulo tenía un color distinto en cada mitad del ERP')
        .toBe(conComponente!.subColor);
    expect(aMano!.subTam).toBe(conComponente!.subTam);
    expect(aMano!.subPeso).toBe(conComponente!.subPeso);

    // Y la barra de acento del título debe estar en las dos.
    expect(conComponente!.acento, 'el componente debe pintar su barra de acento').toBe(true);
    expect(aMano!.acento, 'la cabecera a mano también debe pintarla').toBe(true);
});

test('el separador inferior es el mismo en los dos tipos de cabecera', async ({ page }) => {
    test.setTimeout(180_000);
    const medir = async (ruta: string, sel: string) => {
        await page.goto(ruta, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);
        return page.evaluate(s => {
            const el = document.querySelector(s);
            if (!el) return null;
            const a = getComputedStyle(el, '::after');
            return { alto: a.height, fondo: a.backgroundImage.slice(0, 60) };
        }, sel);
    };
    const comp = await medir('/admin/logistica/batch-picking', '.ph-root');
    const mano = await medir('/admin/contabilidad/plan-cuentas', '.page-header');
    console.log('[SEPARADOR] componente:', JSON.stringify(comp));
    console.log('[SEPARADOR] a mano:    ', JSON.stringify(mano));
    expect(comp, 'debe existir .ph-root').not.toBeNull();
    expect(mano, 'debe existir .page-header').not.toBeNull();
    expect(mano!.alto).toBe(comp!.alto);
    expect(mano!.fondo, 'el separador debe ser el mismo degradado').toBe(comp!.fondo);
});
