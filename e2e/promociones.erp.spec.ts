import { test, expect } from '@playwright/test';

/**
 * Verifica el fix P0 (2026-08-01) de promotions.component.ts: `takeUntilDestroyed()` sin
 * argumento en `ngOnInit` no es contexto de inyección -> la suscripción a
 * `alcance.valueChanges` nunca se instalaba, y al elegir "Producto específico" el selector de
 * producto seguía deshabilitado mientras `montoMinimo` seguía required -> `form.invalid`
 * permanente. Este spec confirma que, tras el fix, el selector de producto queda HABILITADO y
 * se puede crear la promoción.
 *
 * Los datos de prueba (nombre con sufijo E2E-<timestamp>) se borran por SQL al terminar.
 */

const SUFIJO = `E2E-${Date.now().toString().slice(-6)}`;
const NOMBRE_PROMO = `Promo Producto ${SUFIJO}`;

test('alcance PRODUCTO habilita el selector de producto y permite crear la promoción', async ({ page }) => {
    await page.goto('/admin/promotions');
    await expect(page.getByRole('heading', { name: 'Promociones' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Nueva Promoción/i }).click();

    // El host <app-drawer> queda SIEMPRE en el DOM (solo su contenido interno es @if
    // condicional); su bounding box es 0x0 porque el panel real (<aside class="drawer">) va
    // con posicionamiento fixed, así que NO contribuye al layout del padre -- afirmar
    // "visible" sobre <app-drawer> falla incluso con el panel abierto. Se afirma sobre el
    // <aside role="complementary"> real, que solo existe en el DOM cuando isOpen()=true.
    const drawer = page.locator('aside.drawer');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    // NOTA: este formulario usa el modo "content projection" de <app-form-field> (el <input>
    // formControlName va proyectado, no auto-renderizado con [control]) -> el <label> no tiene
    // [for] apuntando al id real del input (el id generado por FormFieldComponent nunca se
    // asigna al input proyectado), así que getByLabel() no los asocia. Se selecciona por
    // formcontrolname, igual que auth.setup.ts/real-auth.helper.ts en esta misma suite.
    await drawer.locator('input[formcontrolname="nombre"]').fill(NOMBRE_PROMO);
    await drawer.locator('input[formcontrolname="valor"]').fill('10');

    // Cambiar Alcance a "Producto específico" -- antes del fix, esto NUNCA deshabilitaba
    // montoMinimo ni habilitaba el selector de producto porque la suscripción jamás se
    // instalaba (NG0203 silencioso: takeUntilDestroyed() sin destroyRef en ngOnInit).
    const selectAlcance = drawer.locator('select[formcontrolname="alcance"]');
    await selectAlcance.selectOption({ label: 'Producto específico' });

    // Aserción central del P0: el selector de producto debe estar HABILITADO.
    const buscadorProducto = drawer.locator('app-server-search-select input.ss-input');
    await expect(buscadorProducto).toBeVisible({ timeout: 10_000 });
    await expect(buscadorProducto).toBeEnabled();

    // Y el campo de "Monto mínimo" (alcance CARRITO) ya no debe estar en el DOM del form
    // (el @if del template solo lo renderiza cuando alcanceActual() === 'CARRITO').
    await expect(drawer.locator('input[formcontrolname="montoMinimo"]')).toHaveCount(0);

    // Seleccionar un producto vía el buscador server-side.
    await buscadorProducto.click();
    await buscadorProducto.fill('a');
    const primeraOpcion = drawer.locator('app-server-search-select li.ss-option').first();
    await expect(primeraOpcion).toBeVisible({ timeout: 10_000 });
    await primeraOpcion.click();

    // Fechas de vigencia.
    const inputs = drawer.locator('input[type="date"]');
    const hoy = new Date().toISOString().split('T')[0];
    const enUnAnio = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await inputs.nth(0).fill(hoy);
    await inputs.nth(1).fill(enUnAnio);

    await drawer.getByRole('button', { name: /Guardar Promoción/i }).click();

    // Si el form seguía inválido (bug pre-fix), el drawer nunca se cierra (isOpen() no baja a
    // false -> el <aside> nunca se remueve del DOM).
    await expect(page.locator('aside.drawer')).toHaveCount(0, { timeout: 12_000 });

    await expect(page.getByText(NOMBRE_PROMO)).toBeVisible({ timeout: 10_000 });

    // Limpieza: la promoción de prueba se borra por SQL fuera de este spec (ver reporte).
});
