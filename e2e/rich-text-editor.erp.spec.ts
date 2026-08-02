import { test, expect } from '@playwright/test';

/**
 * Verificación de runtime del editor de texto enriquecido contra el backend real.
 * Cubre exactamente lo que ni `tsc` ni los tests unitarios ven:
 *  - que el editor MONTE dentro de un formulario reactivo real (el bug NG0951 que
 *    mató la primera versión sólo se manifiesta al construir la vista de verdad);
 *  - que el HTML que produce SOBREVIVA el viaje al microservicio y vuelva pintado
 *    (las columnas eran VARCHAR(255) y el guardado daba 500);
 *  - que la lista no muestre las etiquetas como texto literal.
 */

const SUFIJO = `RTE-${Date.now().toString().slice(-6)}`;
const NOMBRE = `Categoría ${SUFIJO}`;

test.describe('Editor de texto enriquecido', () => {
    test('monta sin errores de consola en un formulario reactivo', async ({ page }) => {
        const errores: string[] = [];
        page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
        page.on('pageerror', e => errores.push(e.message));

        await page.goto('/admin/categories');
        await page.getByRole('button', { name: /Nueva Categoría/i }).click();

        const editor = page.locator('app-rich-text-editor .rte__area');
        await expect(editor).toBeVisible();
        // Barra de formato presente y operable.
        await expect(page.locator('app-rich-text-editor .rte__btn').first()).toBeVisible();

        expect(errores.filter(e => /NG0951|Child query result/.test(e))).toEqual([]);
        expect(errores).toEqual([]);
    });

    test('el HTML con formato persiste en el backend y vuelve renderizado', async ({ page }) => {
        await page.goto('/admin/categories');
        await page.getByRole('button', { name: /Nueva Categoría/i }).click();

        await page.getByLabel('Nombre').fill(NOMBRE);

        const editor = page.locator('app-rich-text-editor .rte__area');
        await editor.click();
        await editor.pressSequentially('Texto en ');
        await page.locator('app-rich-text-editor .rte__btn', { hasText: 'B' }).first().click();
        await editor.pressSequentially('negrita');

        // El control debe llevar marcado real, no texto plano.
        await expect(editor.locator('b, strong')).toHaveCount(1);

        await page.getByRole('button', { name: /Guardar|Crear/i }).click();

        // Sin 500 del microservicio: la fila existe. La lista viene ordenada y paginada,
        // así que se filtra por el buscador en vez de asumir que cae en la página 1.
        await page.getByPlaceholder(/Buscar categor/i).fill(SUFIJO);
        await page.getByRole('button', { name: /^Buscar$/i }).click();

        const fila = page.locator('tbody tr').filter({ hasText: SUFIJO });
        await expect(fila).toHaveCount(1, { timeout: 15_000 });

        // La celda pinta el HTML, no las etiquetas literales.
        await expect(fila).not.toContainText('<b>');
        await expect(fila).not.toContainText('<p>');
        await expect(fila.locator('b, strong')).toHaveCount(1);

        // Al reabrir para editar, el valor guardado vuelve al editor con su formato.
        await fila.getByRole('button', { name: /Editar/i }).click();
        const editorEdicion = page.locator('app-rich-text-editor .rte__area');
        await expect(editorEdicion).toContainText('Texto en negrita');
        await expect(editorEdicion.locator('b, strong')).toHaveCount(1);
    });

    // Limpieza: los datos de prueba se revierten (regla del proyecto).
    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage();
        await page.goto('/admin/categories');
        await page.getByPlaceholder(/Buscar categor/i).fill(SUFIJO);
        await page.getByRole('button', { name: /^Buscar$/i }).click();
        const fila = page.locator('tbody tr').filter({ hasText: SUFIJO });
        if (await fila.count() > 0) {
            await fila.getByRole('button', { name: /Eliminar/i }).click();
            const confirmar = page.getByRole('button', { name: /Confirmar|Eliminar|Sí/i }).last();
            if (await confirmar.isVisible().catch(() => false)) await confirmar.click();
        }
        await page.close();
    });
});
