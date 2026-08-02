import { test, expect } from '@playwright/test';
import { PNG_1PX } from './fixtures/png-1px';

/**
 * Formulario de producto: selector múltiple de categorías con buscador, y galería
 * de imágenes con orden y principal. Verifica en runtime lo que ni `tsc` ni el AOT ven:
 * que el filtro acote de verdad, que la selección viaje al control del formulario, y
 * que subir varias imágenes conserve el orden y la marca de principal.
 */

const SUFIJO = `PROD-${Date.now().toString().slice(-6)}`;
const NOMBRE = `Producto ${SUFIJO}`;

test.describe('Producto — categorías e imágenes', () => {
    test('el selector de categorías filtra y acumula la selección', async ({ page }) => {
        await page.goto('/admin/products');
        await page.getByRole('button', { name: /Nuevo Producto/i }).click();

        const selector = page.locator('app-multi-check-select');
        await expect(selector).toBeVisible();

        // Cerrado por defecto: no debe ocupar el formulario con una lista larga.
        await expect(selector.locator('.mcs__panel')).toHaveCount(0);
        await selector.locator('.mcs__trigger').click();
        await expect(selector.locator('.mcs__panel')).toBeVisible();

        const items = selector.locator('.mcs__item');
        await expect(items.first()).toBeVisible();
        const totalSinFiltro = await items.count();
        expect(totalSinFiltro).toBeGreaterThan(1);

        // El buscador acota de verdad.
        await selector.locator('.mcs__search').fill('zzz-no-existe');
        await expect(items).toHaveCount(0);
        await expect(selector.locator('.mcs__empty')).toBeVisible();

        await selector.locator('.mcs__search').fill('');
        await expect(items).toHaveCount(totalSinFiltro);

        // Marcar dos deja dos chips y el resumen coherente.
        await items.nth(0).click();
        await items.nth(1).click();
        await expect(selector.locator('.mcs__chip')).toHaveCount(2);
        await expect(selector.locator('.mcs__summary')).toContainText('2 seleccionada');

        // Quitar por el chip también deselecciona.
        await selector.locator('.mcs__chip-x').first().click();
        await expect(selector.locator('.mcs__chip')).toHaveCount(1);
    });

    test('acepta varias imágenes, permite ordenarlas y marcar la principal', async ({ page }) => {
        await page.goto('/admin/products');
        await page.getByRole('button', { name: /Nuevo Producto/i }).click();

        await page.getByLabel('Nombre').fill(NOMBRE);
        await page.getByLabel(/Precio Base/i).fill('19.90');

        const galeria = page.locator('app-image-gallery-manager');
        await expect(galeria).toBeVisible();

        // Tres archivos de una sola vez.
        await galeria.locator('input[type="file"]').setInputFiles([
            { name: 'uno.png', mimeType: 'image/png', buffer: PNG_1PX },
            { name: 'dos.png', mimeType: 'image/png', buffer: PNG_1PX },
            { name: 'tres.png', mimeType: 'image/png', buffer: PNG_1PX },
        ]);

        const filas = galeria.locator('.igm__item');
        await expect(filas).toHaveCount(3);
        // La primera queda principal automáticamente: una galería sin principal no sirve.
        await expect(filas.nth(0).locator('.igm__badge')).toHaveText(/Principal/);

        // Bajar la primera la deja en segundo lugar.
        await filas.nth(0).getByRole('button', { name: 'Mover abajo' }).click();
        await expect(filas.nth(1).locator('.igm__badge')).toHaveText(/Principal/);

        // Marcar otra como principal deja UNA sola principal.
        await filas.nth(2).getByRole('button', { name: /Hacer principal/i }).click();
        await expect(galeria.locator('.igm__badge')).toHaveCount(1);
        await expect(filas.nth(2).locator('.igm__badge')).toHaveText(/Principal/);

        // Eliminar una la quita de la cola.
        await filas.nth(0).getByRole('button', { name: 'Eliminar imagen' }).click();
        await expect(filas).toHaveCount(2);

        // Guardar: las 2 restantes deben subirse y el producto aparecer en la lista.
        await page.getByRole('button', { name: /Crear Producto/i }).click();

        await page.getByPlaceholder(/Buscar productos/i).fill(SUFIJO);
        await page.getByRole('button', { name: /^Buscar$/i }).click();
        const fila = page.locator('tbody tr').filter({ hasText: SUFIJO });
        await expect(fila).toHaveCount(1, { timeout: 15_000 });

        // Al reabrir, las imágenes vienen del backend con su orden y su principal.
        await fila.getByRole('button', { name: /Editar/i }).click();
        const guardadas = page.locator('app-image-gallery-manager .igm__item');
        await expect(guardadas).toHaveCount(2, { timeout: 15_000 });
        await expect(page.locator('app-image-gallery-manager .igm__badge')).toHaveCount(1);
        // Ninguna queda como "Sin subir" tras guardar.
        await expect(page.locator('app-image-gallery-manager .igm__pend')).toHaveCount(0);
    });

    /**
     * Los endpoints `PATCH …/principal` y `PUT …/imagenes/orden` sólo se alcanzan
     * sobre imágenes YA guardadas: el test anterior opera sobre pendientes, que son
     * estado de frontend. Aquí se comprueba que el backend persiste ambas cosas.
     */
    test('reordenar y marcar principal se persisten en el backend', async ({ page }) => {
        const suf = `IMG-${Date.now().toString().slice(-6)}`;
        await page.goto('/admin/products');
        await page.getByRole('button', { name: /Nuevo Producto/i }).click();
        await page.getByLabel('Nombre').fill(`Producto ${suf}`);
        await page.getByLabel(/Precio Base/i).fill('9.90');

        const galeria = page.locator('app-image-gallery-manager');
        await galeria.locator('input[type="file"]').setInputFiles([
            { name: 'p1.png', mimeType: 'image/png', buffer: PNG_1PX },
            { name: 'p2.png', mimeType: 'image/png', buffer: PNG_1PX },
        ]);
        await page.getByRole('button', { name: /Crear Producto/i }).click();

        // Reabrir: ahora las imágenes tienen id y los controles pegan al backend.
        await page.getByPlaceholder(/Buscar productos/i).fill(suf);
        await page.getByRole('button', { name: /^Buscar$/i }).click();
        const fila = page.locator('tbody tr').filter({ hasText: suf });
        await expect(fila).toHaveCount(1, { timeout: 15_000 });
        await fila.getByRole('button', { name: /Editar/i }).click();

        const guardadas = page.locator('app-image-gallery-manager .igm__item');
        await expect(guardadas).toHaveCount(2, { timeout: 15_000 });
        await expect(guardadas.nth(0).locator('.igm__badge')).toHaveText(/Principal/);

        // PATCH principal: la segunda pasa a principal y sólo queda una.
        const patch = page.waitForResponse(r =>
            /\/imagenes\/\d+\/principal/.test(r.url()) && r.request().method() === 'PATCH');
        await guardadas.nth(1).getByRole('button', { name: /Hacer principal/i }).click();
        expect((await patch).status()).toBe(200);
        await expect(page.locator('app-image-gallery-manager .igm__badge')).toHaveCount(1);
        await expect(guardadas.nth(1).locator('.igm__badge')).toHaveText(/Principal/);

        // PUT orden: subir la segunda la deja primera, y la principal viaja con ella.
        const put = page.waitForResponse(r =>
            r.url().includes('/imagenes/orden') && r.request().method() === 'PUT');
        await guardadas.nth(1).getByRole('button', { name: 'Mover arriba' }).click();
        expect((await put).status()).toBe(200);
        await expect(guardadas.nth(0).locator('.igm__badge')).toHaveText(/Principal/);

        // Y sobrevive a cerrar y volver a abrir: está persistido, no en memoria.
        await page.getByRole('button', { name: /Cancelar/i }).click();
        await fila.getByRole('button', { name: /Editar/i }).click();
        await expect(guardadas).toHaveCount(2, { timeout: 15_000 });
        await expect(guardadas.nth(0).locator('.igm__badge')).toHaveText(/Principal/);
    });

    /**
     * «Limpiar» tiene que persistir: el update del backend trataba `[]` igual que
     * `null` («no toques»), así que quitar todas las categorías devolvía 200 y al
     * reabrir seguían ahí — un botón que anunciaba algo que no hacía.
     */
    test('quitar todas las categorías se persiste', async ({ page }) => {
        const suf = `CAT-${Date.now().toString().slice(-6)}`;
        await page.goto('/admin/products');
        await page.getByRole('button', { name: /Nuevo Producto/i }).click();
        await page.getByLabel('Nombre').fill(`Producto ${suf}`);
        await page.getByLabel(/Precio Base/i).fill('5.00');

        const selector = page.locator('app-multi-check-select');
        await selector.locator('.mcs__trigger').click();
        await expect(selector.locator('.mcs__item').first()).toBeVisible();
        await selector.locator('.mcs__item').nth(0).click();
        await selector.locator('.mcs__item').nth(1).click();
        await expect(selector.locator('.mcs__chip')).toHaveCount(2);

        await page.getByRole('button', { name: /Crear Producto/i }).click();

        await page.getByPlaceholder(/Buscar productos/i).fill(suf);
        await page.getByRole('button', { name: /^Buscar$/i }).click();
        const fila = page.locator('tbody tr').filter({ hasText: suf });
        await expect(fila).toHaveCount(1, { timeout: 15_000 });

        // Reabrir: las 2 categorías volvieron del backend.
        await fila.getByRole('button', { name: /Editar/i }).click();
        await expect(page.locator('app-multi-check-select .mcs__chip')).toHaveCount(2, { timeout: 15_000 });

        // Limpiar y guardar.
        await page.locator('app-multi-check-select .mcs__trigger').click();
        await page.getByRole('button', { name: /^Limpiar$/i }).click();
        await expect(page.locator('app-multi-check-select .mcs__chip')).toHaveCount(0);
        await page.getByRole('button', { name: /Actualizar Producto/i }).click();

        // Reabrir de nuevo: deben seguir en cero, no reaparecer.
        await fila.getByRole('button', { name: /Editar/i }).click();
        await expect(page.locator('app-multi-check-select')).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('app-multi-check-select .mcs__chip')).toHaveCount(0);
        await expect(page.locator('app-multi-check-select .mcs__summary'))
            .toContainText(/Selecciona categor/i);
    });
});
