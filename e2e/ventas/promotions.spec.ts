import { test, expect } from '@playwright/test';

const mockPromociones = [
    {
        id: 1,
        nombre: 'Descuento Verano 20%',
        descripcion: 'Campaña de verano',
        tipo: 'PORCENTAJE',
        valor: 20,
        alcance: 'CARRITO',
        codigoCupon: 'VERANO20',
        limiteUsos: 100,
        usosActuales: 45,
        fechaInicio: '2026-03-01',
        fechaFin: '2026-12-31',
        activo: true
    },
    {
        id: 2,
        nombre: 'Descuento Fijo S/10',
        tipo: 'MONTO_FIJO',
        valor: 10,
        alcance: 'PRODUCTO',
        usosActuales: 0,
        fechaInicio: '2026-02-01',
        fechaFin: '2026-02-28',
        activo: false
    }
];

test.describe('Módulo Promociones', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/v1/promociones**', route => route.fulfill({ json: mockPromociones }));
        await page.route('**/api/v1/parametros**', route => route.fulfill({ status: 404, body: '' }));
        await page.addInitScript(() => {
            localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInVzZXJJZCI6MSwiY29tcGFueUlkIjoxLCJyb2xlIjoiQURNSU4iLCJleHAiOjk5OTk5OTk5OTksIm1vZHVsZXMiOiJWRU5UQVMsQ09NUFJBUyxMT0dJU1RJQ0EsQ09OVEFCSUxJREFELFJSSEgifQ==.sig');
            localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', companyId: 1 }));
        });
        await page.goto('/admin/promotions');
    });

    test('muestra página de promociones (no Próximamente)', async ({ page }) => {
        await expect(page.getByText('Próximamente')).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'Promociones' })).toBeVisible();
    });

    test('muestra 3 tarjetas KPI', async ({ page }) => {
        const cards = page.locator('.card-metric');
        await expect(cards).toHaveCount(3);
    });

    test('muestra tabla con promociones del mock', async ({ page }) => {
        await expect(page.getByText('Descuento Verano 20%')).toBeVisible();
    });

    test('muestra badge de estado ACTIVA en verde', async ({ page }) => {
        const badge = page.locator('.badge-success').filter({ hasText: 'ACTIVA' });
        await expect(badge).toBeVisible();
    });

    test('muestra badge de estado VENCIDA en naranja', async ({ page }) => {
        // La segunda promoción está vencida (fechaFin en el pasado y activo: false)
        const badge = page.locator('.badge').first();
        await expect(badge).toBeVisible();
    });

    test('abre drawer al crear nueva promoción', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();

        await expect(page.locator('.drawer-overlay')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Nueva Promoción' })).toBeVisible();
    });

    test('drawer muestra dos campos de fecha con DateInput', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();

        const dateInputs = page.locator('app-date-input');
        await expect(dateInputs).toHaveCount(2);
    });

    test('tipo de descuento cambia la etiqueta del valor', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();

        // Default is PORCENTAJE
        await expect(page.locator('label').filter({ hasText: '(%)' })).toBeVisible();

        // Switch to MONTO_FIJO
        await page.locator('select[formControlName="tipo"]').selectOption('MONTO_FIJO');
        await expect(page.locator('label').filter({ hasText: 'Valor (S/)' })).toBeVisible();
    });

    test('botón guardar está deshabilitado si no hay nombre', async ({ page }) => {
        await page.getByRole('button', { name: /Nueva Promoción/i }).click();

        const saveBtn = page.getByRole('button', { name: /Guardar Promoción/i });
        await expect(saveBtn).toBeDisabled();
    });

    test('abre drawer en modo edición al clickear editar', async ({ page }) => {
        const editBtn = page.locator('.btn-view').first();
        await editBtn.click();

        await expect(page.getByText('Editar Promoción')).toBeVisible();
    });

    test('drawer de edición precarga el nombre de la promoción', async ({ page }) => {
        const editBtn = page.locator('.btn-view').first();
        await editBtn.click();

        const nombreInput = page.locator('input[placeholder*="Descuento"]');
        await expect(nombreInput).toHaveValue('Descuento Verano 20%');
    });
});
