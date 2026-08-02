import { test, expect } from '@playwright/test';

/**
 * Verifica la pantalla /admin/mi-perfil (creada para reemplazar el enlace roto
 * que compartían "Mi perfil" y "Configuración" en el menú del avatar, ambos
 * apuntando a /admin/configuracion, una ruta inexistente).
 *
 * NO cambia la contraseña real del usuario de pruebas: solo verifica que el
 * backend rechaza una contraseña actual incorrecta con su mensaje real.
 */
test.describe('Mi perfil (ERP)', () => {
    test('pinta los datos del usuario autenticado', async ({ page }) => {
        await page.goto('/admin/mi-perfil');

        await expect(page.locator('.page-title')).toHaveText('Mi perfil');

        const datos = page.locator('.perfil-datos');
        await expect(datos).toBeVisible({ timeout: 15_000 });

        // Usuario y rol deben pintarse con el valor real de la sesión (test.superadmin / SUPERADMIN)
        const filaUsuario = datos.locator('.perfil-dato', { hasText: 'Usuario' });
        await expect(filaUsuario.locator('dd')).toHaveText('test.superadmin');

        const filaRol = datos.locator('.perfil-dato', { hasText: 'Rol' });
        await expect(filaRol.locator('dd')).not.toHaveText('—');

        const filaEmpresa = datos.locator('.perfil-dato', { hasText: 'Empresa activa' });
        await expect(filaEmpresa.locator('dd')).not.toHaveText('—');

        await page.screenshot({ path: '../.claude/workspace/screenshots/mi-perfil.png', fullPage: true });
    });

    test('el formulario de cambio de contraseña rechaza la contraseña actual incorrecta', async ({ page }) => {
        await page.goto('/admin/mi-perfil');

        await page.locator('#currentPassword').fill('ContraseñaIncorrectaXYZ123');
        await page.locator('#newPassword').fill('NuevaClave#2026Temp');
        await page.locator('#confirmPassword').fill('NuevaClave#2026Temp');

        const respuesta = page.waitForResponse(
            r => r.url().includes('/api/users/me/password') && r.request().method() === 'PUT',
        );
        await page.locator('button[type="submit"]', { hasText: 'Cambiar contraseña' }).click();
        const res = await respuesta;

        // El backend rechaza la contraseña actual incorrecta (no 2xx)
        expect(res.ok(), 'el backend NO debe aceptar una contraseña actual incorrecta').toBeFalsy();

        // El formulario muestra el mensaje de error real (no éxito)
        await expect(page.locator('.alert-error')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.alert-success')).toHaveCount(0);
    });

    test('«Mi perfil» y «Configuración» del menú del avatar apuntan a rutas distintas y válidas', async ({ page }) => {
        await page.goto('/admin/dashboard');

        await page.locator('.user-menu').click();
        const miPerfilLink = page.locator('a', { hasText: 'Mi perfil' });
        await expect(miPerfilLink).toHaveAttribute('href', '/admin/mi-perfil');

        // "Configuración" solo se muestra para SUPERADMIN (sesión de prueba lo es)
        const configLink = page.locator('a', { hasText: 'Configuración' });
        await expect(configLink).toHaveAttribute('href', '/admin/general-config');

        await configLink.click();
        await page.waitForURL(url => url.toString().includes('/admin/general-config'));
        await expect(page.locator('.page-title')).toHaveText('Configuración del Sistema');
    });
});
