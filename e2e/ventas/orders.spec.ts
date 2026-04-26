import { test, expect } from '@playwright/test';

const mockOrders = {
    content: [
        {
            id: 1,
            fechaPedido: '2026-03-20T10:00:00',
            userId: 101,
            total: 250.00,
            estado: 'PENDIENTE',
            detalles: [
                { productoId: 1, nombreProducto: 'Laptop', cantidad: 1, precioUnitario: 250.00, subtotal: 250.00 }
            ]
        },
        {
            id: 2,
            fechaPedido: '2026-03-19T15:30:00',
            userId: 102,
            total: 75.50,
            estado: 'ENTREGADO',
            detalles: [
                { productoId: 2, nombreProducto: 'Mouse', cantidad: 1, precioUnitario: 75.50, subtotal: 75.50 }
            ]
        }
    ],
    totalElements: 2,
    totalPages: 1,
    number: 0,
    size: 10
};

const mockOrderDetail = {
    id: 1,
    fechaPedido: '2026-03-20T10:00:00',
    userId: 101,
    total: 250.00,
    estado: 'PENDIENTE',
    detalles: [
        { productoId: 1, nombreProducto: 'Laptop', cantidad: 1, precioUnitario: 250.00, subtotal: 250.00 }
    ]
};

test.describe('Módulo Pedidos', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/pedidos**', route => route.fulfill({ json: mockOrders }));
        await page.route('**/api/pedidos/1**', route => route.fulfill({ json: mockOrderDetail }));
        // Mock auth
        await page.route('**/api/v1/parametros**', route => route.fulfill({ status: 404, body: '' }));
        await page.addInitScript(() => {
            localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInVzZXJJZCI6MSwiY29tcGFueUlkIjoxLCJyb2xlIjoiQURNSU4iLCJleHAiOjk5OTk5OTk5OTksIm1vZHVsZXMiOiJWRU5UQVMsQ09NUFJBUyxMT0dJU1RJQ0EsQ09OVEFCSUxJREFELFJSSEgifQ==.sig');
            localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', companyId: 1 }));
        });
        await page.goto('/admin/orders');
    });

    test('muestra tabla de pedidos con datos', async ({ page }) => {
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByText('S/ 250.00')).toBeVisible();
    });

    test('muestra badge de estado con clase correcta', async ({ page }) => {
        const badge = page.locator('.badge-warning').first();
        await expect(badge).toBeVisible();
        await expect(badge).toContainText('Pendiente');
    });

    test('muestra badge de entregado en verde', async ({ page }) => {
        const badge = page.locator('.badge-success').first();
        await expect(badge).toBeVisible();
        await expect(badge).toContainText('Entregado');
    });

    test('abre drawer al hacer click en Ver detalle', async ({ page }) => {
        const viewBtn = page.locator('.btn-view').first();
        await viewBtn.click();

        // Drawer should open
        await expect(page.locator('.drawer-overlay')).toBeVisible();
    });

    test('fecha se muestra en formato peruano', async ({ page }) => {
        // Format es-PE: dd/mm/yyyy
        await expect(page.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/).first()).toBeVisible();
    });

    test('total se muestra con símbolo de sol', async ({ page }) => {
        await expect(page.getByText('S/ 250.00')).toBeVisible();
    });
});
