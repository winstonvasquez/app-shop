import { test, expect } from '@playwright/test';

const mockPedidosPaginados = {
    content: [
        { id: 1, fechaPedido: '2026-03-29T08:00:00', userId: 101, total: 320.00, estado: 'PENDIENTE', detalles: [] },
        { id: 2, fechaPedido: '2026-03-29T09:30:00', userId: 102, total: 150.00, estado: 'ENTREGADO', detalles: [] },
        { id: 3, fechaPedido: '2026-03-28T11:00:00', userId: 103, total: 89.90,  estado: 'ENVIADO',   detalles: [] },
    ],
    totalElements: 3,
    totalPages: 1,
    number: 0,
    size: 5
};

const mockVentasPos = {
    content: [
        { id: 1, fecha: '2026-03-29T08:00:00', total: 45.00, metodoPago: 'EFECTIVO' },
        { id: 2, fecha: '2026-03-29T09:00:00', total: 120.00, metodoPago: 'YAPE' },
    ],
    totalElements: 2,
    totalPages: 1,
    number: 0,
    size: 5
};

test.describe('Dashboard Ventas', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/pedidos**', route => route.fulfill({ json: mockPedidosPaginados }));
        await page.route('**/api/ventas/pos**', route => route.fulfill({ json: mockVentasPos }));
        await page.route('**/api/v1/parametros**', route => route.fulfill({ status: 404, body: '' }));
        await page.addInitScript(() => {
            localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInVzZXJJZCI6MSwiY29tcGFueUlkIjoxLCJyb2xlIjoiQURNSU4iLCJleHAiOjk5OTk5OTk5OTksIm1vZHVsZXMiOiJWRU5UQVMsQ09NUFJBUyxMT0dJU1RJQ0EsQ09OVEFCSUxJREFELFJSSEgifQ==.sig');
            localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', companyId: 1 }));
        });
        await page.goto('/admin/ventas/dashboard');
    });

    test('muestra dashboard de ventas (no dashboard genérico)', async ({ page }) => {
        // Should show ventas-specific content
        await expect(page.locator('app-ventas-dashboard')).toBeVisible();
    });

    test('muestra tarjetas KPI', async ({ page }) => {
        const cards = page.locator('.kpi-card');
        await expect(cards).toHaveCount(5);
    });

    test('KPI ventas hoy incluye símbolo de sol', async ({ page }) => {
        await expect(page.getByText(/S\/\s*\d+/).first()).toBeVisible();
    });

    test('muestra tabla de últimos pedidos', async ({ page }) => {
        await expect(page.getByRole('table')).toBeVisible();
    });

    test('tabla muestra pedido con estado badge', async ({ page }) => {
        await expect(page.locator('.badge').first()).toBeVisible();
    });

    test('tabla muestra pedidos del mock', async ({ page }) => {
        await expect(page.getByText('S/ 320.00')).toBeVisible();
    });

    test('título de página es Ventas', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Dashboard Ventas' })).toBeVisible();
    });
});
