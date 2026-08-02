import { test, expect } from '@playwright/test';

/**
 * El catálogo del POS sólo pintaba la etiqueta de promociones de alcance CATEGORIA: su DTO no
 * traía el `productoId`, así que una promoción vinculada a un producto concreto se creaba sin
 * problema y se veía en la tienda, pero en el punto de venta —donde se cobra— no aparecía nada.
 *
 * Se crea una promoción de alcance PRODUCTO real, se comprueba que el POS la devuelve y la pinta,
 * y se borra al terminar.
 */

const API = '/sales/api';

test.describe.configure({ mode: 'serial' });

// El interceptor de Angular inyecta X-Tenant-ID en cada peticion del navegador; el contexto
// `request` de Playwright no pasa por el, y varios POST/PUT resuelven el tenant desde esa
// cabecera (no del query param), asi que sin ella responden 403.
test.use({ extraHTTPHeaders: { 'X-Tenant-ID': '1' } });

let promocionId = 0;
let productoId = 0;
let productoNombre = '';
let varianteSku = '';

test('crea una promoción de alcance PRODUCTO', async ({ request }) => {
    // Un producto con variante, para que salga en el catálogo del POS (que lista variantes).
    const cat = await request.get(`${API}/pos/catalogo?companyId=1&size=1`);
    expect(cat.ok(), 'el catálogo del POS debe responder').toBeTruthy();
    const item = (await cat.json()).content[0];
    productoId = item.productoId;
    productoNombre = item.nombreProducto;
    varianteSku = item.sku;
    console.log(`[PREP] producto=${productoId} (${productoNombre}) sku=${varianteSku}`);
    expect(productoId, 'el DTO del catálogo POS debe traer productoId').toBeTruthy();

    const hoy = new Date();
    const fin = new Date(hoy.getTime() + 30 * 24 * 3600 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const res = await request.post(`${API}/v1/promociones?companyId=1`, {
        data: {
            nombre: 'XT-PROMO-PRODUCTO-TMP', tipo: 'PORCENTAJE', valor: 15,
            alcance: 'PRODUCTO', productoId,
            fechaInicio: iso(hoy), fechaFin: iso(fin), activo: true,
        },
    });
    expect(res.status(), `debe crearse la promoción (${await res.text()})`).toBeLessThan(400);
    promocionId = (await res.json()).id;
    console.log(`[PREP] promocion=${promocionId}`);
});

test('el catálogo del POS devuelve la etiqueta de esa promoción', async ({ request }) => {
    const res = await request.get(`${API}/pos/catalogo?companyId=1&q=${encodeURIComponent(varianteSku)}&size=50`);
    const filas: Array<{ productoId: number; sku: string; promocionEtiqueta: string | null }> =
        (await res.json()).content;
    const fila = filas.find(f => f.sku === varianteSku);
    console.log(`[POS-API] ${fila?.sku} -> promocionEtiqueta=${JSON.stringify(fila?.promocionEtiqueta)}`);
    expect(fila, 'la variante debe estar en el catálogo').toBeTruthy();
    expect(fila!.promocionEtiqueta, 'el POS debe traer la etiqueta de una promoción de alcance PRODUCTO')
        .toBe('-15%');
});

test('la etiqueta se pinta en la pantalla del POS', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pos');
    await page.waitForTimeout(4000);
    await page.getByPlaceholder(/Buscar producto, SKU/i).fill(varianteSku);

    const badge = page.locator('span[class*="rounded-full"]').filter({ hasText: /15%/ });
    await expect(badge.first(), 'la etiqueta debe verse sobre la tarjeta del producto')
        .toBeVisible({ timeout: 20_000 });
    const estilo = await badge.first().evaluate(el => {
        const s = getComputedStyle(el);
        return { color: s.color, fondo: s.backgroundColor, texto: el.textContent?.trim() };
    });
    console.log('[POS-UI] estilo:', JSON.stringify(estilo));
    expect(estilo.fondo, 'debe tener fondo de color').not.toBe('rgba(0, 0, 0, 0)');
    await page.screenshot({ path: '.claude/workspace/screenshots/pos-etiqueta-alcance-producto.png' });
});

test('limpia: borra la promoción de prueba', async ({ request }) => {
    const res = await request.delete(`${API}/v1/promociones/${promocionId}?companyId=1`);
    console.log(`[CLEAN] DELETE promoción -> ${res.status()}`);
    expect(res.status(), 'la promoción temporal debe quedar borrada').toBeLessThan(400);
});
