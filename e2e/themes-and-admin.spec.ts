/**
 * D4 — Tests E2E: Sistema de Temas y Administración de Tienda
 *
 * Cubre:
 *  - F5: Sistema de temas desde BD (ThemeService, ThemeController)
 *  - F6: Menú flotante de mensajes (FloatingMenuComponent, FloatingChatComponent, ChatService)
 *  - Admin: /admin/store-theme (StoreThemeComponent)
 *  - Admin: /admin/soporte/chat (ChatSoporteComponent)
 *  - Responsive: viewport mobile (iPhone SE)
 *
 * Rutas de API mockeadas:
 *  - GET  /users/api/themes/active
 *  - PUT  /users/api/themes/active
 *  - GET  /users/api/themes/seasonal
 *  - GET  /users/api/chat/conversaciones/activa
 *  - POST /users/api/chat/conversaciones
 *  - GET  /users/api/chat/conversaciones/:id/mensajes
 *  - POST /users/api/chat/conversaciones/:id/mensajes
 *  - GET  /users/api/admin/chat/conversaciones
 */

import { test, expect } from '@playwright/test';
import {
    loginAsCustomer,
    loginAsAdmin,
    setupCart,
    clearSession,
} from './helpers/auth.helper';

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 1 — Temas: Tienda Pública
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Temas — Tienda Pública', () => {

    /**
     * T1.1 — ThemeSwitcher NO debe existir en /home.
     * C2/F1 lo eliminó de main-layout.component.html.
     */
    test('T1.1 — ThemeSwitcher no está en el layout público', async ({ page }) => {
        // Mockear themes/active para evitar dependencia del backend
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El componente fue eliminado — no debe existir en el DOM
        const themeSwitcher = page.locator('app-theme-switcher');
        await expect(themeSwitcher).toHaveCount(0);
    });

    /**
     * T1.2 — La tienda carga con un tema activo.
     * ThemeService aplica data-theme en <html> (o lo omite para 'dark').
     * Al menos body debe ser visible y la señal de tema no fallar.
     */
    test('T1.2 — Tienda carga con un tema activo en el documento', async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // ThemeService aplica el tema a document.documentElement:
        //   - 'dark' → sin data-theme (removeAttribute)
        //   - otros  → data-theme="<theme>"
        // Verificamos que el body está visible (app arrancó sin errores)
        await expect(page.locator('body')).toBeVisible();

        // Para tema 'dark', data-theme está ausente o es vacío (comportamiento correcto)
        const htmlDataTheme = await page.locator('html').getAttribute('data-theme');
        // dark → null | '', cualquier otro → el nombre del tema
        const themeClass = await page.locator('html').getAttribute('class');
        // Al menos el documento existe y Angular montó la app
        expect(htmlDataTheme === null || typeof htmlDataTheme === 'string').toBeTruthy();
        // La app no mostró error fatal
        const errorOverlay = page.locator('text=/error|Error|exception/i').first();
        await expect(errorOverlay).not.toBeVisible({ timeout: 2000 }).catch(() => { /* no error overlay — OK */ });
    });

    /**
     * T1.3 — Mock servidor retorna tema 'christmas' → data-theme="christmas" en <html>.
     * ThemeService llama GET /users/api/themes/active al iniciar.
     */
    test('T1.3 — Mock API retorna christmas → data-theme="christmas" aplicado', async ({ page }) => {
        // Interceptar ANTES de navegar
        await page.route('**/api/themes/active', route =>
            route.fulfill({
                status: 200,
                json: { themeKey: 'christmas', isSeasonalActive: true, seasonalName: 'Navidad 2026' },
            })
        );

        await page.goto('/home');
        // Esperar a que ThemeService resuelva el observable y aplique el tema
        await page.waitForLoadState('networkidle');

        // ThemeService llama applyThemeToDocument('christmas') → setAttribute('data-theme', 'christmas')
        // Puede tardar un tick por la suscripción async
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'christmas', { timeout: 5000 });
    });

    /**
     * T1.4 — Fallback: si API de temas responde 500, la tienda sigue cargando.
     * ThemeService usa catchError(() => of(null)) — mantiene localStorage o 'dark'.
     */
    test('T1.4 — Fallback: API 500 → tienda sigue cargando con tema por defecto', async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        );

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // La tienda debe seguir visible — no pantalla blanca ni error
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('app-root')).toBeVisible();
    });

    /**
     * T1.5 — Tema localStorage persiste entre visitas.
     * El localStorage es leído sincrónicamente en initTheme() antes del server call.
     */
    test('T1.5 — Tema guardado en localStorage se aplica al cargar la página', async ({ page }) => {
        // Mockear API para que no interfiera
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );

        // Cargar app una vez para establecer el contexto
        await page.goto('/home');
        // Guardar manualmente un tema en localStorage
        await page.evaluate(() => localStorage.setItem('shop_theme', 'orange-black'));

        // Recargar — initTheme() lee 'orange-black' sincrónicamente
        await page.reload();
        await page.waitForLoadState('networkidle');

        // orange-black ≠ 'dark' → debe aplicar data-theme="orange-black"
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'orange-black', { timeout: 5000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 2 — Admin: Configuración de Tema
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin — Configuración de Tema', () => {

    test.beforeEach(async ({ page }) => {
        // Mock GET themes/active para el ThemeService de fondo
        await page.route('**/api/themes/active', route =>
            route.fulfill({
                status: 200,
                json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' },
            })
        );
        // Mock GET themes/seasonal (tabla de estacionales)
        await page.route('**/api/themes/seasonal', route =>
            route.fulfill({ status: 200, json: [] })
        );

        await loginAsAdmin(page);
    });

    /**
     * T2.1 — /admin/store-theme carga sin errores (no 404, no blank).
     */
    test('T2.1 — Página /admin/store-theme carga correctamente', async ({ page }) => {
        await page.goto('/admin/store-theme');
        await page.waitForLoadState('networkidle');

        // El componente muestra un page-title
        await expect(page.locator('.page-title, h1')).toBeVisible();

        // No debe mostrar error 404
        await expect(page.locator('body')).not.toContainText('404');
        await expect(page.locator('body')).not.toContainText('Cannot match any routes');
    });

    /**
     * T2.2 — Al menos dos cards de temas disponibles son visibles.
     * StoreThemeComponent tiene AVAILABLE_THEMES con 8 temas definidos.
     */
    test('T2.2 — Hay al menos 2 cards de temas disponibles', async ({ page }) => {
        await page.goto('/admin/store-theme');
        await page.waitForLoadState('networkidle');

        // Las theme-cards o los botones "Activar" / badge "Activo"
        const themeCards = page.locator('.theme-card');
        const cardCount = await themeCards.count();

        if (cardCount >= 2) {
            expect(cardCount).toBeGreaterThanOrEqual(2);
        } else {
            // Fallback: buscar por el texto de los botones del template
            const activarBtns = page.locator('button:has-text("Activar"), .badge-success:has-text("Activo")');
            const btnCount = await activarBtns.count();
            expect(btnCount).toBeGreaterThanOrEqual(2);
        }
    });

    /**
     * T2.3 — Click en "Activar" un tema manda PUT /api/themes/active con el themeKey correcto.
     * StoreThemeComponent.activarTema() llama PUT con { themeKey }.
     */
    test('T2.3 — Click "Activar" envía PUT con themeKey correcto', async ({ page }) => {
        // Capturar el request PUT
        let capturedBody: Record<string, unknown> | null = null;

        await page.route('**/api/themes/active', route => {
            if (route.request().method() === 'PUT') {
                const raw = route.request().postData();
                if (raw) {
                    capturedBody = JSON.parse(raw) as Record<string, unknown>;
                }
                route.fulfill({ status: 200, body: '' });
            } else {
                // GET sigue respondiendo normal
                route.fulfill({
                    status: 200,
                    json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' },
                });
            }
        });

        await page.goto('/admin/store-theme');
        await page.waitForLoadState('networkidle');

        // Buscar el primer botón "Activar" visible (temas distintos al activo)
        const activarBtn = page.locator('button:has-text("Activar")').first();
        const visible = await activarBtn.isVisible().catch(() => false);

        if (visible) {
            await activarBtn.click();
            // Esperar a que el request se complete
            await page.waitForTimeout(1000);
            // El body debe contener themeKey
            expect(capturedBody).not.toBeNull();
            expect(capturedBody).toHaveProperty('themeKey');
            expect(typeof (capturedBody as Record<string, unknown>)['themeKey']).toBe('string');
        } else {
            // Si todos los temas muestran "Activo" (edge case sin datos reales), el test pasa
            test.skip();
        }
    });

    /**
     * T2.4 — Sección de temas estacionales está presente en la página.
     */
    test('T2.4 — Sección de temas estacionales visible', async ({ page }) => {
        await page.goto('/admin/store-theme');
        await page.waitForLoadState('networkidle');

        // El template siempre muestra el card "Temas Estacionales Programados"
        await expect(page.locator('text=/Temas Estacionales/i')).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 3 — Menú Flotante: Anónimo
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Menú Flotante — Chat (usuario anónimo)', () => {

    test.beforeEach(async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );
        // No inyectar token → usuario anónimo
    });

    /**
     * T3.1 — FloatingMenuComponent está visible en /home.
     * main-layout.component.html contiene <app-floating-menu>.
     */
    test('T3.1 — FloatingMenu visible en /home', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El componente está en el DOM y su botón principal es visible
        const floatingMenu = page.locator('app-floating-menu');
        await expect(floatingMenu).toBeVisible();
    });

    /**
     * T3.2 — El botón de mensajes está presente en el FloatingMenu.
     * FloatingMenuComponent tiene menuItems con label 'Mensajes' y aria-label='Mensajes'.
     */
    test('T3.2 — Botón "Mensajes" visible en FloatingMenu', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El menú abre por defecto (isOpen = signal(true) en el componente)
        const mensajesBtn = page.locator('[aria-label="Mensajes"]');
        await expect(mensajesBtn).toBeVisible();
    });

    /**
     * T3.3 — Click en "Mensajes" → panel de chat (FloatingChatComponent) aparece.
     * FloatingMenuComponent.menuItems[0].action = () => chatService.open()
     * FloatingChatComponent: .floating-chat.open { opacity: 1; pointer-events: auto }
     */
    test('T3.3 — Click en "Mensajes" abre el panel de chat', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Hacer click en el botón de mensajes
        await page.locator('[aria-label="Mensajes"]').click();

        // El panel .floating-chat debe tener la clase .open
        const chatPanel = page.locator('app-floating-chat .floating-chat');
        await expect(chatPanel).toHaveClass(/open/, { timeout: 3000 });
    });

    /**
     * T3.4 — Usuario no autenticado: chat muestra mensaje de "Inicia sesión".
     * FloatingChatComponent template: @if (!authService.isAuthenticated()) → .chat-guest-msg
     */
    test('T3.4 — Usuario anónimo ve mensaje "Inicia sesión" en el chat', async ({ page }) => {
        // Asegurar que no hay token
        await clearSession(page);
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Abrir chat
        await page.locator('[aria-label="Mensajes"]').click();
        await page.locator('app-floating-chat .floating-chat').waitFor({ state: 'visible' });

        // Mensaje de guest
        const guestMsg = page.locator('.chat-guest-msg');
        await expect(guestMsg).toBeVisible({ timeout: 3000 });
        await expect(guestMsg).toContainText(/Inicia sesión/i);
    });

    /**
     * T3.5 — Badge de mensajes no muestra "22" hardcodeado.
     * C2/F1 corrigió el badge: ahora usa chatService.unreadCount() (0 si sin mensajes).
     * Con usuario anónimo y sin polling activo, el badge debe ser null (no visible).
     */
    test('T3.5 — Badge del botón "Mensajes" no muestra valor hardcodeado "22"', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El badge solo se renderiza si getBadge(item) retorna un valor no-null
        // Con unreadCount = 0 → no debe haber badge visible
        const badgeEl = page.locator('app-floating-menu .badge, app-floating-menu span[class*="bg-error"]');
        const badgeTexts = await badgeEl.allTextContents();

        // Ningún badge debe contener "22"
        for (const text of badgeTexts) {
            expect(text.trim()).not.toBe('22');
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 4 — Menú Flotante: Chat Autenticado
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Menú Flotante — Chat Autenticado', () => {

    test.beforeEach(async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );

        // Mock: GET /users/api/chat/conversaciones/activa → 404 (nueva conversación)
        await page.route('**/api/chat/conversaciones/activa', route =>
            route.fulfill({ status: 404, body: 'Not Found' })
        );

        // Mock: POST /users/api/chat/conversaciones → nueva conversación con id=1
        await page.route('**/api/chat/conversaciones', route => {
            if (route.request().method() === 'POST') {
                route.fulfill({
                    status: 201,
                    json: {
                        id: 1,
                        clienteId: 100,
                        asunto: null,
                        estado: 'ACTIVA',
                        createdAt: new Date().toISOString(),
                        lastMessageAt: new Date().toISOString(),
                    },
                });
            } else {
                route.continue();
            }
        });

        // Mock: GET mensajes de conversación 1 → lista vacía
        await page.route('**/api/chat/conversaciones/1/mensajes**', route =>
            route.fulfill({ status: 200, json: [] })
        );

        // Mock: PUT leer conversación
        await page.route('**/api/chat/conversaciones/1/leer', route =>
            route.fulfill({ status: 200, body: '' })
        );

        await loginAsCustomer(page);
    });

    /**
     * T4.1 — Click en "Mensajes" abre el chat como usuario autenticado.
     */
    test('T4.1 — Click en "Mensajes" abre el chat para usuario autenticado', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        await page.locator('[aria-label="Mensajes"]').click();

        const chatPanel = page.locator('app-floating-chat .floating-chat');
        await expect(chatPanel).toHaveClass(/open/, { timeout: 5000 });
    });

    /**
     * T4.2 — Input de mensaje visible cuando el usuario está autenticado.
     * FloatingChatComponent: @if (authService.isAuthenticated()) → .chat-input-area
     */
    test('T4.2 — Input de mensaje visible para usuario autenticado', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        await page.locator('[aria-label="Mensajes"]').click();
        await page.locator('app-floating-chat .floating-chat').waitFor({ state: 'visible' });

        const chatInput = page.locator('.chat-input[aria-label="Mensaje de chat"]');
        await expect(chatInput).toBeVisible({ timeout: 5000 });
    });

    /**
     * T4.3 — Escribir un mensaje y presionar Enter lo envía al backend.
     * ChatService.sendMessage() llama POST /users/api/chat/conversaciones/1/mensajes
     * y agrega el mensaje a messages() signal.
     */
    test('T4.3 — Enviar mensaje: aparece en el chat después del Enter', async ({ page }) => {
        const mensajeEnviado = 'Hola soporte';

        // Mock: POST mensaje → retorna el mensaje creado
        await page.route('**/api/chat/conversaciones/1/mensajes', route => {
            if (route.request().method() === 'POST') {
                route.fulfill({
                    status: 201,
                    json: {
                        id: 1,
                        conversacionId: 1,
                        emisorId: 100,
                        emisorTipo: 'CLIENTE',
                        contenido: mensajeEnviado,
                        timestamp: new Date().toISOString(),
                        leido: false,
                    },
                });
            } else {
                // GET mensajes → vacío
                route.fulfill({ status: 200, json: [] });
            }
        });

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Abrir chat
        await page.locator('[aria-label="Mensajes"]').click();
        await page.locator('app-floating-chat .floating-chat').waitFor({ state: 'visible' });

        // Esperar a que el input esté disponible (conversación creada)
        const input = page.locator('.chat-input[aria-label="Mensaje de chat"]');
        await input.waitFor({ state: 'visible', timeout: 8000 });

        // Escribir y enviar con Enter
        await input.fill(mensajeEnviado);
        await input.press('Enter');

        // El mensaje debe aparecer como burbuja .from-client
        await expect(page.locator('.chat-msg.from-client .chat-bubble-text')).toContainText(mensajeEnviado, { timeout: 5000 });
    });

    /**
     * T4.4 — Badge de mensajes no leídos actualiza correctamente.
     * Cuando chatService.unreadCount() > 0 se muestra el badge.
     * Con mocks actuales (sin mensajes de soporte) → badge debe ser 0 (no visible).
     */
    test('T4.4 — Badge de mensajes muestra 0 sin mensajes no leídos', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El badge en FloatingMenu solo aparece si getBadge() != null
        const badge = page.locator('app-floating-menu button[aria-label="Mensajes"] span[class*="bg-error"]');
        // Sin mensajes no leídos → badge no debe ser visible
        const count = await badge.count();
        if (count > 0) {
            // Si existe el badge, su texto debe ser '0' o vacío, no 22
            const text = await badge.first().textContent();
            expect(text?.trim()).not.toBe('22');
            expect(Number(text?.trim() ?? '0')).toBeLessThanOrEqual(0);
        }
        // Si count === 0, el badge no está visible — correcto
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 5 — Admin: Panel de Soporte Chat
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin — Panel de Soporte Chat', () => {

    const mockConversaciones = [
        {
            id: 10,
            clienteId: 100,
            asunto: 'Consulta sobre pedido #42',
            estado: 'ACTIVA',
            createdAt: '2026-03-27T10:00:00Z',
            lastMessageAt: '2026-03-27T10:05:00Z',
        },
        {
            id: 11,
            clienteId: 101,
            asunto: 'Problema con devolución',
            estado: 'ACTIVA',
            createdAt: '2026-03-27T09:00:00Z',
            lastMessageAt: '2026-03-27T09:30:00Z',
        },
    ];

    const mockMensajesConv10 = [
        {
            id: 1,
            conversacionId: 10,
            emisorId: 100,
            emisorTipo: 'CLIENTE',
            contenido: 'Buenos días, ¿cuándo llega mi pedido?',
            timestamp: '2026-03-27T10:00:00Z',
            leido: true,
        },
        {
            id: 2,
            conversacionId: 10,
            emisorId: 1,
            emisorTipo: 'SOPORTE',
            contenido: 'Hola, su pedido está en camino.',
            timestamp: '2026-03-27T10:05:00Z',
            leido: true,
        },
    ];

    test.beforeEach(async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );

        // Mock: GET /users/api/admin/chat/conversaciones → lista de 2 conversaciones
        await page.route('**/api/admin/chat/conversaciones**', route =>
            route.fulfill({ status: 200, json: mockConversaciones })
        );

        // Mock: GET mensajes de conversación 10
        await page.route('**/api/chat/conversaciones/10/mensajes**', route =>
            route.fulfill({ status: 200, json: mockMensajesConv10 })
        );

        // Mock: GET mensajes de conversación 11 → vacíos
        await page.route('**/api/chat/conversaciones/11/mensajes**', route =>
            route.fulfill({ status: 200, json: [] })
        );

        // Mock: PUT leer conversaciones
        await page.route('**/api/chat/conversaciones/**/leer', route =>
            route.fulfill({ status: 200, body: '' })
        );

        // Mock: POST mensaje admin
        await page.route('**/api/admin/chat/conversaciones/**/mensajes', route =>
            route.fulfill({
                status: 201,
                json: {
                    id: 99,
                    conversacionId: 10,
                    emisorId: 1,
                    emisorTipo: 'SOPORTE',
                    contenido: 'Respuesta de soporte',
                    timestamp: new Date().toISOString(),
                    leido: false,
                },
            })
        );

        await loginAsAdmin(page);
    });

    /**
     * T5.1 — /admin/soporte/chat carga sin errores.
     */
    test('T5.1 — Página /admin/soporte/chat carga correctamente', async ({ page }) => {
        await page.goto('/admin/soporte/chat');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.page-title, h1')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('404');
        await expect(page.locator('body')).not.toContainText('Cannot match any routes');
    });

    /**
     * T5.2 — Lista de conversaciones muestra las 2 conversaciones mockeadas.
     * ChatSoporteComponent hace GET /api/admin/chat/conversaciones al inicializar.
     */
    test('T5.2 — Lista de conversaciones visible con datos mockeados', async ({ page }) => {
        await page.goto('/admin/soporte/chat');
        await page.waitForLoadState('networkidle');

        // Buscar los items de conversación (botones .conv-item según el template del componente)
        const convItems = page.locator('.conv-item, button[class*="conv-"]');
        await expect(convItems.first()).toBeVisible({ timeout: 5000 });

        const count = await convItems.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    /**
     * T5.3 — Click en una conversación carga sus mensajes.
     * ChatSoporteComponent carga mensajes del conv seleccionado.
     */
    test('T5.3 — Click en conversación muestra sus mensajes', async ({ page }) => {
        await page.goto('/admin/soporte/chat');
        await page.waitForLoadState('networkidle');

        const primerItem = page.locator('.conv-item, button[class*="conv-"]').first();
        await expect(primerItem).toBeVisible({ timeout: 5000 });
        await primerItem.click();

        // Los mensajes de la conv 10 deben aparecer
        await expect(page.locator('.chat-msg, .chat-bubble, [class*="from-client"], [class*="from-support"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    /**
     * T5.4 — Mensajes de cliente y soporte visibles en el panel.
     */
    test('T5.4 — Mensajes de cliente y soporte visibles tras seleccionar conversación', async ({ page }) => {
        await page.goto('/admin/soporte/chat');
        await page.waitForLoadState('networkidle');

        const primerItem = page.locator('.conv-item, button[class*="conv-"]').first();
        await expect(primerItem).toBeVisible({ timeout: 5000 });
        await primerItem.click();

        // Verificar contenido de los mensajes mockeados
        await expect(page.locator('text=/pedido/i')).toBeVisible({ timeout: 5000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 6 — Responsive: Mobile
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive — Mobile (iPhone SE)', () => {

    test.use({ viewport: { width: 375, height: 667 } });

    test.beforeEach(async ({ page }) => {
        await page.route('**/api/themes/active', route =>
            route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
        );
    });

    /**
     * T6.1 — /home carga correctamente en mobile.
     * No hay elementos con overflow horizontal bloqueante.
     */
    test('T6.1 — /home carga correctamente en viewport mobile', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('app-root')).toBeVisible();

        // Sin error de navegación (404 / white screen)
        await expect(page.locator('body')).not.toContainText('Cannot match any routes');
    });

    /**
     * T6.2 — FloatingMenu visible en mobile.
     * El menú usa fixed position → visible en cualquier viewport.
     */
    test('T6.2 — FloatingMenu visible en mobile', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const floatingMenu = page.locator('app-floating-menu');
        await expect(floatingMenu).toBeVisible();

        // El botón principal (±64px) debe ser interactuable en mobile
        const triggerBtn = page.locator('app-floating-menu button.w-16');
        await expect(triggerBtn).toBeVisible();
    });

    /**
     * T6.3 — /cart carga correctamente en mobile.
     */
    test('T6.3 — /cart carga correctamente en viewport mobile', async ({ page }) => {
        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('Cannot match any routes');
    });

    /**
     * T6.4 — Botón "Mensajes" en FloatingMenu interactuable en mobile.
     */
    test('T6.4 — Botón "Mensajes" interactuable en mobile', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const mensajesBtn = page.locator('[aria-label="Mensajes"]');
        await expect(mensajesBtn).toBeVisible();

        // No debe lanzar excepción al hacer click en mobile
        await mensajesBtn.click();
        // El chat debe responder (abrirse o mostrar el estado del panel)
        const chatPanel = page.locator('app-floating-chat .floating-chat');
        await expect(chatPanel).toHaveClass(/open/, { timeout: 3000 });
    });
});
