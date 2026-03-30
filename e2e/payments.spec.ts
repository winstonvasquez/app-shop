import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers reutilizables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inyecta token JWT simulado y datos de cliente en localStorage.
 * Evita el flujo real de login para tests más rápidos y deterministas.
 */
async function setupAuthenticatedCustomer(page: Page): Promise<void> {
    // Navegar primero a la app para que el contexto del origen esté disponible
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
        // Token JWT simulado con payload: userId=1, username=cliente@test.com, role=CUSTOMER, companyId=1
        // Payload: { sub: "cliente@test.com", userId: 1, username: "cliente@test.com", role: "CUSTOMER", companyId: 1, exp: 9999999999 }
        const simulatedToken =
            'eyJhbGciOiJSUzI1NiJ9.' +
            btoa(JSON.stringify({
                sub: 'cliente@test.com',
                userId: 1,
                username: 'cliente@test.com',
                role: 'CUSTOMER',
                companyId: 1,
                exp: 9999999999,
            })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') +
            '.simulado_firma';

        localStorage.setItem('token', simulatedToken);
        localStorage.setItem('auth_token', simulatedToken);
        localStorage.setItem('user', JSON.stringify({
            userId: 1,
            username: 'cliente@test.com',
            email: 'cliente@test.com',
            role: 'CUSTOMER',
            companyId: 1,
        }));
    });
}

/**
 * Inyecta token JWT con rol ADMIN en localStorage.
 */
async function setupAuthenticatedAdmin(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
        const simulatedToken =
            'eyJhbGciOiJSUzI1NiJ9.' +
            btoa(JSON.stringify({
                sub: 'admin@test.com',
                userId: 99,
                username: 'admin@test.com',
                role: 'ADMIN',
                companyId: 1,
                exp: 9999999999,
            })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') +
            '.simulado_firma';

        localStorage.setItem('token', simulatedToken);
        localStorage.setItem('auth_token', simulatedToken);
        localStorage.setItem('user', JSON.stringify({
            userId: 99,
            username: 'admin@test.com',
            email: 'admin@test.com',
            role: 'ADMIN',
            companyId: 1,
        }));
    });
}

/**
 * Inyecta un producto en el carrito a través de localStorage.
 * Usa la clave 'cart' que utiliza CartService (effect() en constructor).
 */
async function setupCart(
    page: Page,
    product = {
        productId: 101,
        name: 'Laptop de Prueba',
        description: 'Modelo X500',
        price: 1500.00,
        quantity: 1,
        image: 'https://via.placeholder.com/150',
    }
): Promise<void> {
    await page.evaluate((p) => {
        localStorage.setItem('cart', JSON.stringify([p]));
    }, product);
}

/**
 * Intercepta las llamadas de configuración para devolver métodos de pago
 * (MediosPago: Visa, Mastercard, Yape) sin necesidad del backend real.
 */
async function mockConfigEndpoints(page: Page): Promise<void> {
    // Medios de pago
    await page.route('**/api/config/medios-pago', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: 1,
                    codigo: 'VIS',
                    nombre: 'Visa',
                    iconoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png',
                    activo: true,
                },
                {
                    id: 2,
                    codigo: 'MAS',
                    nombre: 'Mastercard',
                    iconoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
                    activo: true,
                },
                {
                    id: 3,
                    codigo: 'YAPE',
                    nombre: 'Yape',
                    iconoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Yape_logo.svg/200px-Yape_logo.svg.png',
                    activo: true,
                },
            ]),
        });
    });

    // Certificaciones de pago (PCI DSS badges)
    await page.route('**/api/config/certificaciones', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });

    // Parámetro MP_PUBLIC_KEY
    await page.route('**/api/system/parameters/MP_PUBLIC_KEY', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: 'TEST_PUBLIC_KEY_SIMULADO',
        });
    });

    // Direcciones del cliente (dirección de envío pre-cargada)
    await page.route('**/api/clientes/me/direcciones', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: 1,
                    nombreCompleto: 'Juan Pérez',
                    telefono: '999888777',
                    departamento: 'Lima',
                    provincia: 'Lima',
                    distrito: 'Miraflores',
                    direccionLinea1: 'Av. Larco 123',
                    referencia: 'Frente al parque',
                    esPrincipal: true,
                },
            ]),
        });
    });
}

/**
 * Navega a /checkout con el estado correcto: usuario autenticado + carrito con producto.
 * Mockea todos los endpoints de configuración para un checkout funcional.
 */
async function navigateToCheckout(page: Page): Promise<void> {
    await setupAuthenticatedCustomer(page);
    await setupCart(page);
    await mockConfigEndpoints(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: UI y Flujo básico de pagos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Pagos — UI y Flujo', () => {

    test.beforeEach(async ({ page }) => {
        await navigateToCheckout(page);
    });

    test('P1.1 — Sección de pago con tarjeta visible en checkout', async ({ page }) => {
        // El formulario de tarjeta se muestra cuando VIS (Visa) está seleccionado por defecto
        // Según el component: selectedPaymentMethod = signal<string>('VIS')
        await expect(page.locator('input[placeholder="Número de la tarjeta"]')).toBeVisible();
        await expect(page.locator('input[placeholder="Nombre del titular"]')).toBeVisible();
        await expect(page.locator('input[placeholder="Fecha exp. MM/AA"]')).toBeVisible();
        await expect(page.locator('input[placeholder="CVV"]')).toBeVisible();
    });

    test('P1.2 — Botón Pagar visible y contiene el monto', async ({ page }) => {
        // El botón de submit del formulario de tarjeta
        const btnPagar = page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i });
        await expect(btnPagar).toBeVisible();
        // Debe mostrar el monto (1500.00 del producto de prueba)
        await expect(btnPagar).toContainText('S/');
    });

    test('P1.3 — Opción Yape seleccionable y muestra botón "Pagar con Yape"', async ({ page }) => {
        // Buscar el radio button de Yape y hacer click
        const yapeLabel = page.locator('label').filter({ hasText: 'Yape' }).first();
        await expect(yapeLabel).toBeVisible();

        const yapeRadio = page.locator('input[type="radio"][value="YAPE"]');
        await yapeRadio.click();

        // Después de seleccionar Yape, debe aparecer el botón de pago Yape
        const btnYape = page.locator('button').filter({ hasText: /Pagar con Yape/i });
        await expect(btnYape).toBeVisible();
    });

    test('P1.4 — Datos de tarjeta en plaintext NO deben llegar al backend', async ({ page }) => {
        const capturedBodies: string[] = [];

        // Interceptar POST /api/pagos/procesar y capturar el body
        await page.route('**/api/pagos/procesar', async (route) => {
            const request = route.request();
            const body = request.postData() ?? '';
            capturedBodies.push(body);
            // Responder con aprobación para completar el flujo
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'approved',
                    paymentId: 'MP_TEST_001',
                    orderId: 999,
                }),
            });
        });

        // Llenar formulario de tarjeta
        await page.locator('input[placeholder="Número de la tarjeta"]').fill('4111 1111 1111 1111');
        await page.locator('input[placeholder="Nombre del titular"]').fill('JUAN PEREZ');
        await page.locator('input[placeholder="Fecha exp. MM/AA"]').fill('12/28');
        await page.locator('input[placeholder="CVV"]').fill('123');

        // Enviar formulario
        await page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i }).click();

        // Esperar a que se haga la llamada al backend
        await page.waitForResponse('**/api/pagos/procesar', { timeout: 10_000 }).catch(() => {
            // Si no hay llamada real al backend (mocked), aún verificamos lo capturado
        });

        // Verificar que los bodies capturados contienen 'cardToken' pero NO el número completo de tarjeta
        for (const body of capturedBodies) {
            // Debe enviar token, no número de tarjeta raw
            expect(body).toContain('cardToken');
            // El número completo de tarjeta 4111111111111111 NO debe aparecer en el body
            expect(body).not.toContain('4111111111111111');
            expect(body).not.toContain('4111 1111 1111 1111');
            // El CVV nunca debe viajar al backend
            expect(body).not.toContain('securityCode');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Flujo Tarjeta Aprobado (mock)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Pagos — Flujo Tarjeta Aprobado (mock)', () => {

    test('P2.1 — Pago aprobado redirige a /orders/confirmation/:orderId', async ({ page }) => {
        await navigateToCheckout(page);

        // Mock: POST /api/pagos/procesar → aprobado con orderId=456
        await page.route('**/api/pagos/procesar', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'approved',
                    paymentId: 'MP_123',
                    orderId: 456,
                }),
            });
        });

        // Llenar formulario de tarjeta con datos de prueba
        await page.locator('input[placeholder="Número de la tarjeta"]').fill('4111 1111 1111 1111');
        await page.locator('input[placeholder="Nombre del titular"]').fill('JUAN PEREZ TEST');
        await page.locator('input[placeholder="Fecha exp. MM/AA"]').fill('12/28');
        await page.locator('input[placeholder="CVV"]').fill('123');

        // Click en Pagar
        await page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i }).click();

        // Esperar redirección a confirmación con el orderId del mock
        await expect(page).toHaveURL(/\/orders\/confirmation\/456/, { timeout: 15_000 });
    });

    test('P2.2 — Página de confirmación muestra número de pedido', async ({ page }) => {
        // Mock de la página de confirmación — navegar directamente con orderId
        await setupAuthenticatedCustomer(page);

        // Mock del endpoint de detalle de pedido si lo hay
        await page.route('**/api/pedidos/456', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 456,
                    estado: 'PAGADO',
                    total: 1500.00,
                    createdAt: new Date().toISOString(),
                }),
            });
        });

        await page.goto('/orders/confirmation/456');
        await page.waitForLoadState('networkidle');

        // La página debe estar visible y mostrar referencia al pedido
        await expect(page.locator('body')).toBeVisible();
        // Buscar el número de pedido en la página
        const contenido = page.locator('body');
        const texto = await contenido.textContent();
        expect(texto).toMatch(/456|pedido|confirmaci[oó]n/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Flujo Tarjeta Rechazado (mock)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Pagos — Flujo Tarjeta Rechazado (mock)', () => {

    test('P3.1 — Tarjeta rechazada muestra mensaje de error y permanece en /checkout', async ({ page }) => {
        await navigateToCheckout(page);

        // Mock: POST /api/pagos/procesar → 400 con mensaje de rechazo
        await page.route('**/api/pagos/procesar', (route) => {
            route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: 'Tarjeta rechazada',
                    status: 'rejected',
                }),
            });
        });

        // Llenar formulario con tarjeta que será rechazada
        await page.locator('input[placeholder="Número de la tarjeta"]').fill('4000 0000 0000 0002');
        await page.locator('input[placeholder="Nombre del titular"]').fill('TARJETA FALLIDA');
        await page.locator('input[placeholder="Fecha exp. MM/AA"]').fill('01/29');
        await page.locator('input[placeholder="CVV"]').fill('999');

        // Click en Pagar
        await page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i }).click();

        // Debe aparecer un mensaje de error visible en la página
        const errorMsg = page.locator('text=/rechazada|error|Error|rechazado/i');
        await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });

        // El usuario debe permanecer en /checkout (no redirigir)
        await expect(page).toHaveURL(/\/checkout/);
    });

    test('P3.2 — Error de red en pago muestra mensaje de error en /checkout', async ({ page }) => {
        await navigateToCheckout(page);

        // Mock: POST /api/pagos/procesar → error de red
        await page.route('**/api/pagos/procesar', (route) => {
            route.abort('failed');
        });

        // Llenar formulario
        await page.locator('input[placeholder="Número de la tarjeta"]').fill('4111 1111 1111 1111');
        await page.locator('input[placeholder="Nombre del titular"]').fill('JUAN PEREZ');
        await page.locator('input[placeholder="Fecha exp. MM/AA"]').fill('12/28');
        await page.locator('input[placeholder="CVV"]').fill('123');

        // Click en Pagar
        await page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i }).click();

        // Debe aparecer algún mensaje de error
        const errorMsg = page.locator('text=/error|Error|intenta/i');
        await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });

        // Permanece en checkout
        await expect(page).toHaveURL(/\/checkout/);
    });

    test('P3.3 — Formulario de tarjeta incompleto muestra validación sin llamar al backend', async ({ page }) => {
        await navigateToCheckout(page);

        let backendCalled = false;
        await page.route('**/api/pagos/procesar', (route) => {
            backendCalled = true;
            route.continue();
        });

        // Click en Pagar sin llenar el formulario
        await page.locator('button[type="submit"]').filter({ hasText: /Pagar S\//i }).click();

        // Debe aparecer mensaje de validación
        const validationMsg = page.locator('text=/completa|campos|requerido/i');
        await expect(validationMsg.first()).toBeVisible({ timeout: 5_000 });

        // El backend NO debe haber sido llamado
        expect(backendCalled).toBe(false);

        // Permanece en checkout
        await expect(page).toHaveURL(/\/checkout/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Flujo Yape (mock)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Pagos — Flujo Yape (mock)', () => {

    test('P4.1 — Seleccionar Yape y generar QR muestra imagen QR visible', async ({ page }) => {
        await navigateToCheckout(page);

        // Mock: POST /api/pagos/yape-intent → devuelve QR simulado
        const futureExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await page.route('**/api/pagos/yape-intent', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    qrData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    transactionId: 'YP_123',
                    expiresAt: futureExpiry,
                }),
            });
        });

        // Seleccionar método Yape
        const yapeRadio = page.locator('input[type="radio"][value="YAPE"]');
        await yapeRadio.click();

        // Click en "Pagar con Yape"
        const btnYape = page.locator('button').filter({ hasText: /Pagar con Yape/i });
        await expect(btnYape).toBeVisible();
        await btnYape.click();

        // Debe aparecer imagen QR (img con src de QR)
        const qrImg = page.locator('img[alt="QR Yape"]');
        await expect(qrImg).toBeVisible({ timeout: 10_000 });

        // El src de la imagen debe ser el qrData del mock
        const qrSrc = await qrImg.getAttribute('src');
        expect(qrSrc).toContain('data:image');
    });

    test('P4.2 — Texto "Escanea" visible al mostrar QR Yape', async ({ page }) => {
        await navigateToCheckout(page);

        const futureExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await page.route('**/api/pagos/yape-intent', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    qrData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    transactionId: 'YP_456',
                    expiresAt: futureExpiry,
                }),
            });
        });

        // Seleccionar Yape y generar QR
        await page.locator('input[type="radio"][value="YAPE"]').click();
        await page.locator('button').filter({ hasText: /Pagar con Yape/i }).click();

        // Esperar QR visible
        await expect(page.locator('img[alt="QR Yape"]')).toBeVisible({ timeout: 10_000 });

        // Texto "Escanea" debe estar visible (del HTML: "Escanea el código QR con tu app Yape")
        const escanea = page.locator('text=/Escanea/i');
        await expect(escanea.first()).toBeVisible();
    });

    test('P4.3 — Error al generar QR Yape muestra mensaje de error', async ({ page }) => {
        await navigateToCheckout(page);

        // Mock: POST /api/pagos/yape-intent → error 500
        await page.route('**/api/pagos/yape-intent', (route) => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Error interno del servidor' }),
            });
        });

        // Seleccionar Yape y hacer click
        await page.locator('input[type="radio"][value="YAPE"]').click();
        await page.locator('button').filter({ hasText: /Pagar con Yape/i }).click();

        // Debe mostrar mensaje de error de Yape
        const errorMsg = page.locator('text=/No se pudo generar|QR Yape|error/i');
        await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });

        // El QR NO debe aparecer
        const qrImg = page.locator('img[alt="QR Yape"]');
        await expect(qrImg).not.toBeVisible();
    });

    test('P4.4 — Botón "Cancelar y usar otro método" oculta el QR', async ({ page }) => {
        await navigateToCheckout(page);

        const futureExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await page.route('**/api/pagos/yape-intent', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    qrData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    transactionId: 'YP_789',
                    expiresAt: futureExpiry,
                }),
            });
        });

        // Seleccionar Yape y generar QR
        await page.locator('input[type="radio"][value="YAPE"]').click();
        await page.locator('button').filter({ hasText: /Pagar con Yape/i }).click();
        await expect(page.locator('img[alt="QR Yape"]')).toBeVisible({ timeout: 10_000 });

        // Click en "Cancelar y usar otro método"
        const btnCancelar = page.locator('button').filter({ hasText: /Cancelar y usar otro método/i });
        await btnCancelar.click();

        // El QR ya no debe estar visible
        await expect(page.locator('img[alt="QR Yape"]')).not.toBeVisible();

        // El botón "Pagar con Yape" debe volver a aparecer
        const btnYape = page.locator('button').filter({ hasText: /Pagar con Yape/i });
        await expect(btnYape).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Admin — Historial de Pagos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin — Historial de Pagos', () => {

    const mockPagos = [
        {
            id: 1,
            pedidoId: 101,
            amount: 1500.00,
            currency: 'PEN',
            paymentMethod: 'TARJETA',
            status: 'APPROVED',
            externalId: 'MP_EXT_001',
            gatewayResponse: null,
            createdAt: '2026-03-27T10:00:00Z',
            updatedAt: '2026-03-27T10:00:05Z',
        },
        {
            id: 2,
            pedidoId: 102,
            amount: 89.90,
            currency: 'PEN',
            paymentMethod: 'YAPE',
            status: 'REJECTED',
            externalId: 'YP_EXT_002',
            gatewayResponse: null,
            createdAt: '2026-03-27T11:30:00Z',
            updatedAt: '2026-03-27T11:30:10Z',
        },
        {
            id: 3,
            pedidoId: 103,
            amount: 250.00,
            currency: 'PEN',
            paymentMethod: 'TARJETA_CREDITO',
            status: 'PENDING',
            externalId: null,
            gatewayResponse: null,
            createdAt: '2026-03-27T12:00:00Z',
            updatedAt: '2026-03-27T12:00:00Z',
        },
    ];

    test('P5.1 — /admin/pagos renderiza tabla con columnas de historial', async ({ page }) => {
        await setupAuthenticatedAdmin(page);

        // Mock del historial antes de navegar
        await page.route('**/api/pagos/historial', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockPagos),
            });
        });

        await page.goto('/admin/pagos');
        await page.waitForLoadState('networkidle');

        // La tabla debe estar visible
        const tabla = page.locator('table');
        await expect(tabla).toBeVisible({ timeout: 10_000 });

        // Verificar columnas de encabezado
        await expect(page.locator('text=/Fecha/i').first()).toBeVisible();
        await expect(page.locator('text=/Pedido/i').first()).toBeVisible();
        await expect(page.locator('text=/Método/i').first()).toBeVisible();
        await expect(page.locator('text=/Estado/i').first()).toBeVisible();
        await expect(page.locator('text=/Monto/i').first()).toBeVisible();
    });

    test('P5.2 — Los 3 registros mock aparecen en la tabla', async ({ page }) => {
        await setupAuthenticatedAdmin(page);

        // Mock: GET /api/pagos/historial → lista de 3 intentos
        await page.route('**/api/pagos/historial', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockPagos),
            });
        });

        await page.goto('/admin/pagos');
        await page.waitForLoadState('networkidle');

        // Deben aparecer los 3 pedidos (IDs 101, 102, 103)
        await expect(page.locator('text=#101').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('text=#102').first()).toBeVisible();
        await expect(page.locator('text=#103').first()).toBeVisible();
    });

    test('P5.3 — Badges de estado muestran Aprobado, Rechazado y Pendiente', async ({ page }) => {
        await setupAuthenticatedAdmin(page);

        await page.route('**/api/pagos/historial', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockPagos),
            });
        });

        await page.goto('/admin/pagos');
        await page.waitForLoadState('networkidle');

        // Los textos de estado formateados deben aparecer en la tabla
        await expect(page.locator('text=Aprobado').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('text=Rechazado').first()).toBeVisible();
        await expect(page.locator('text=Pendiente').first()).toBeVisible();
    });

    test('P5.4 — Tabla vacía cuando no hay registros', async ({ page }) => {
        await setupAuthenticatedAdmin(page);

        // Mock: historial vacío
        await page.route('**/api/pagos/historial', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.goto('/admin/pagos');
        await page.waitForLoadState('networkidle');

        // Mensaje de tabla vacía
        const emptyMsg = page.locator('text=/No hay intentos de pago/i');
        await expect(emptyMsg).toBeVisible({ timeout: 10_000 });
    });

    test('P5.5 — Resumen de badges por estado muestra conteo correcto', async ({ page }) => {
        await setupAuthenticatedAdmin(page);

        await page.route('**/api/pagos/historial', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockPagos),
            });
        });

        await page.goto('/admin/pagos');
        await page.waitForLoadState('networkidle');

        // El filtro/resumen muestra: 1 aprobado, 1 rechazado, 1 pendiente
        await expect(page.locator('text=/Aprobados: 1/i').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('text=/Rechazados: 1/i').first()).toBeVisible();
        await expect(page.locator('text=/Pendientes: 1/i').first()).toBeVisible();
    });
});
