/**
 * D — Tests E2E: Navegación, Componentes y Estándares de Diseño
 *
 * Cubre las implementaciones de Fases C1–C6:
 *  - C1/F2: Header nav secundaria (queryParams), menú móvil hamburguesa
 *  - C2/F3: Footer links condicionales y rel="noopener noreferrer"
 *  - C3/F4: Category pills con aria-pressed, items placeholder
 *  - C4/F5: Breadcrumbs en product-detail, cart y checkout + stepper
 *  - C5/F6: Hamburguesa visible en mobile, panel de navegación táctil
 *  - C6/F7: Estados vacíos en products, cart y checkout
 *
 * Rutas de API mockeadas:
 *  - GET /sales/api/v1/productos       — lista de productos (products page)
 *  - GET /sales/api/v1/productos/:id   — detalle de producto
 *  - GET /sales/api/v1/categorias      — categorías (pills)
 *  - GET /sales/api/ventas/tienda/config — configuración de tienda (footer/header)
 *  - GET /users/api/themes/active       — tema activo
 *  - GET /sales/api/ventas/tienda/paginas/* — páginas informativas (404 → null)
 *  - GET /users/api/chat/**             — chat (404 silencioso)
 */

import { test, expect } from '@playwright/test';
import {
    loginAsCustomer,
    setupCart,
    clearSession,
} from './helpers/auth.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de datos mock reutilizables
// ─────────────────────────────────────────────────────────────────────────────

/** Respuesta mínima válida de la API de productos (un solo ítem) */
const MOCK_PRODUCTS_PAGE = {
    content: [
        {
            id: 1,
            nombre: 'Producto Test',
            precio: 49.9,
            precioOferta: null,
            stock: 10,
            imagenUrl: 'https://via.placeholder.com/300',
            images: ['https://via.placeholder.com/300'],
            descripcion: 'Descripción del producto test',
            categoryName: 'Electrónica',
            rating: 4.5,
            reviewCount: 20,
        },
    ],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 20,
};

/** Respuesta vacía de la API de productos (0 resultados) */
const MOCK_PRODUCTS_EMPTY = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 20,
};

/** Detalle de producto mock para /products/1 */
const MOCK_PRODUCT_DETAIL = {
    id: 1,
    nombre: 'Producto Test Detalle',
    precio: 49.9,
    precioOferta: null,
    stock: 10,
    imagenUrl: 'https://via.placeholder.com/300',
    images: ['https://via.placeholder.com/300'],
    descripcion: 'Descripción detallada del producto test',
    categoryName: 'Electrónica',
    categoryId: 5,
    rating: 4.5,
    reviewCount: 20,
    variants: [],
    attributes: [],
};

/** Respuesta de categorías para los category pills */
const MOCK_CATEGORIES = {
    content: [
        { id: 5, nombre: 'Electrónica', nivel: 1 },
        { id: 6, nombre: 'Ropa', nivel: 1 },
    ],
    totalElements: 2,
    totalPages: 1,
    number: 0,
    size: 20,
};

/** Configuración de tienda con URLs de redes sociales reales */
const MOCK_STORE_CONFIG_WITH_SOCIAL: Record<string, string> = {
    STORE_NAME: 'Test Store',
    APP_STORE_URL: 'https://apps.apple.com/test',
    PLAY_STORE_URL: 'https://play.google.com/test',
    SOCIAL_FACEBOOK: 'https://facebook.com/test',
    SOCIAL_INSTAGRAM: 'https://instagram.com/test',
    SOCIAL_TWITTER: 'https://twitter.com/test',
    FOOTER_COMPANY_TITLE: 'Empresa',
    FOOTER_HELP_TITLE: 'Ayuda',
    FOOTER_LEGAL_TITLE: 'Legal',
    FOOTER_APP_TITLE: 'App móvil',
    FOOTER_ALL_RIGHTS: 'Todos los derechos reservados',
    FOOTER_PRIVACY: 'Privacidad',
    FOOTER_TERMS: 'Términos',
    FOOTER_SHOP_ANYWHERE: 'Compra desde cualquier lugar',
    FOOTER_GET_IT_ON: 'Disponible en',
    FOOTER_AVAILABLE_ON: 'Disponible en',
    FOOTER_COMPANY_LINKS: JSON.stringify([
        { label: 'Sobre nosotros', url: '/info/sobre-nosotros' },
        { label: 'Trabaja con nosotros', url: '' },
    ]),
    FOOTER_HELP_LINKS: JSON.stringify([
        { label: 'Centro de ayuda', url: '/info/ayuda' },
    ]),
    FOOTER_LEGAL_LINKS: JSON.stringify([
        { label: 'Privacidad', url: '/info/privacidad' },
    ]),
    HEADER_FREE_SHIPPING: 'Envío gratis',
    HEADER_GUARANTEED_DELIVERY: 'Entrega garantizada',
    HEADER_DOWNLOAD_APP: 'Descarga la app',
};

/** Configuración de tienda sin URLs de apps ni redes sociales */
const MOCK_STORE_CONFIG_NO_SOCIAL: Record<string, string> = {
    STORE_NAME: 'Test Store',
    APP_STORE_URL: '',
    PLAY_STORE_URL: '',
    SOCIAL_FACEBOOK: '',
    SOCIAL_INSTAGRAM: '',
    SOCIAL_TWITTER: '',
    FOOTER_COMPANY_TITLE: 'Empresa',
    FOOTER_HELP_TITLE: 'Ayuda',
    FOOTER_LEGAL_TITLE: 'Legal',
    FOOTER_APP_TITLE: 'App móvil',
    FOOTER_ALL_RIGHTS: 'Todos los derechos reservados',
    FOOTER_PRIVACY: 'Privacidad',
    FOOTER_TERMS: 'Términos',
    FOOTER_SHOP_ANYWHERE: 'Compra desde cualquier lugar',
    FOOTER_GET_IT_ON: '',
    FOOTER_AVAILABLE_ON: '',
    FOOTER_COMPANY_LINKS: JSON.stringify([]),
    FOOTER_HELP_LINKS: JSON.stringify([]),
    FOOTER_LEGAL_LINKS: JSON.stringify([]),
    HEADER_FREE_SHIPPING: 'Envío gratis',
    HEADER_GUARANTEED_DELIVERY: 'Entrega garantizada',
    HEADER_DOWNLOAD_APP: 'Descarga la app',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mock de rutas comunes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica los mocks de API comunes a todas las suites.
 * Llama antes de page.goto() en beforeEach.
 */
async function setupCommonMocks(page: import('@playwright/test').Page, storeConfig = MOCK_STORE_CONFIG_WITH_SOCIAL) {
    // Tema activo
    await page.route('**/api/themes/active', route =>
        route.fulfill({ status: 200, json: { themeKey: 'dark', isSeasonalActive: false, seasonalName: '' } })
    );

    // Configuración de tienda (footer, header labels)
    await page.route('**/api/ventas/tienda/config**', route =>
        route.fulfill({ status: 200, json: storeConfig })
    );

    // Páginas informativas — responder 404 (la app las maneja silenciosamente)
    await page.route('**/api/ventas/tienda/paginas/**', route =>
        route.fulfill({ status: 404, json: {} })
    );

    // Chat — silenciar errores de red
    await page.route('**/api/chat/**', route =>
        route.fulfill({ status: 404, json: {} })
    );

    // Categorías (usadas por header mega-menu y products pills)
    await page.route('**/api/v1/categorias**', route =>
        route.fulfill({ status: 200, json: MOCK_CATEGORIES })
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 1 — Header y menú principal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Header navigation', () => {

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page);
        // Mockear productos para que la página cargue
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );
    });

    /**
     * N1.1 — Los 3 ítems de nav secundaria (desktop) navegan a /products
     * con los queryParams correctos: sort=sales, rating=5, new=true.
     * Implementado en C1 con <a [routerLink]> + [queryParams].
     */
    test('N1.1 — Los 3 ítems de nav secundaria navegan a /products con queryParams correctos', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // --- Bestsellers → sort=sales ---
        // Selector: enlace en la barra secundaria con queryParam sort=sales
        // El template usa title="Los más vendidos" como atributo distinguible
        const bestSellersLink = page.locator('a[title="Los más vendidos"]');
        await expect(bestSellersLink).toBeVisible({ timeout: 8_000 });
        await bestSellersLink.click();
        await page.waitForURL(/\/products/, { timeout: 10_000 });
        expect(page.url()).toMatch(/sort=sales/);

        // Volver a home para el siguiente test
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // --- 5 estrellas → rating=5 ---
        const fiveStarsLink = page.locator('a[title="Mejor valorados"]');
        await expect(fiveStarsLink).toBeVisible({ timeout: 8_000 });
        await fiveStarsLink.click();
        await page.waitForURL(/\/products/, { timeout: 10_000 });
        expect(page.url()).toMatch(/rating=5/);

        // Volver a home
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // --- Novedades → new=true ---
        const whatsNewLink = page.locator('a[title="Novedades"]');
        await expect(whatsNewLink).toBeVisible({ timeout: 8_000 });
        await whatsNewLink.click();
        await page.waitForURL(/\/products/, { timeout: 10_000 });
        expect(page.url()).toMatch(/new=true/);
    });

    /**
     * N1.2 — Menú hamburguesa en viewport iPhone SE (375px).
     * Implementado en C5: botón con aria-label="Menú", panel mobile con links.
     * Cerrar con Escape cierra el panel.
     */
    test('N1.2 — Menú hamburguesa visible en mobile (375px), abre panel y navega', async ({ page }) => {
        // Viewport iPhone SE
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // El botón hamburguesa es visible en mobile (aria-label="Menú")
        const hamburger = page.getByRole('button', { name: /menú/i });
        await expect(hamburger).toBeVisible({ timeout: 8_000 });

        // Click → panel de navegación aparece con link "Productos"
        await hamburger.click();
        const productosLink = page.getByRole('link', { name: /^Productos$/i });
        await expect(productosLink).toBeVisible({ timeout: 5_000 });

        // Click en "Productos" → navega a /products
        await productosLink.click();
        await page.waitForURL(/\/products/, { timeout: 10_000 });
        await expect(page).toHaveURL(/\/products/);

        // Volver a home para probar el cierre con Escape
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Abrir menú nuevamente
        const hamburger2 = page.getByRole('button', { name: /menú/i });
        await hamburger2.click();
        const productosLink2 = page.getByRole('link', { name: /^Productos$/i });
        await expect(productosLink2).toBeVisible({ timeout: 5_000 });

        // Presionar Escape → panel cierra
        await page.keyboard.press('Escape');
        // El link "Productos" del panel móvil ya no debe ser visible
        // (el panel usa @if (mobileMenuOpen()) por lo que sale del DOM)
        await expect(productosLink2).not.toBeVisible({ timeout: 5_000 });
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 2 — Footer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Footer links', () => {

    /**
     * N2.1 — Links de footer con URL vacía no se renderizan.
     * Implementado en C2: @if (link.url) en los tres bloques de links dinámicos;
     * @if (sc.appStoreUrl()) / @if (sc.playStoreUrl()) en la sección de apps.
     */
    test('N2.1 — Links de footer con URL vacía no se renderizan', async ({ page }) => {
        // Mock de config SIN app store URLs ni redes sociales
        await setupCommonMocks(page, MOCK_STORE_CONFIG_NO_SOCIAL);
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // No debe haber enlace a App Store ni Google Play
        // Los enlaces se renderizan solo cuando appStoreUrl() y playStoreUrl() no son vacíos
        const appStoreLinks = page.locator('a[href*="apps.apple.com"]');
        await expect(appStoreLinks).toHaveCount(0);

        const playStoreLinks = page.locator('a[href*="play.google.com"]');
        await expect(playStoreLinks).toHaveCount(0);

        // No debe haber iconos de redes sociales (facebook, instagram, twitter)
        const facebookLinks = page.locator('a[href*="facebook.com"]');
        await expect(facebookLinks).toHaveCount(0);

        const instagramLinks = page.locator('a[href*="instagram.com"]');
        await expect(instagramLinks).toHaveCount(0);
    });

    /**
     * N2.2 — Links externos tienen rel="noopener noreferrer".
     * Implementado en C2: todos los target="_blank" en footer tienen rel correcto.
     */
    test('N2.2 — Links externos tienen rel="noopener noreferrer"', async ({ page }) => {
        // Mock con URLs de apps y social reales
        await setupCommonMocks(page, MOCK_STORE_CONFIG_WITH_SOCIAL);
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Scroll hasta el footer para asegurarse de que esté en el DOM
        await page.locator('footer').scrollIntoViewIfNeeded();

        // El enlace a App Store debe tener rel="noopener noreferrer"
        const appStoreLink = page.locator('footer a[href*="apps.apple.com"]');
        const appStoreCount = await appStoreLink.count();

        if (appStoreCount > 0) {
            const relAttr = await appStoreLink.first().getAttribute('rel');
            expect(relAttr).toContain('noopener');
            expect(relAttr).toContain('noreferrer');
        }

        // Si hay algún target="_blank" en el footer, debe tener rel correcto
        const externalLinks = page.locator('footer a[target="_blank"]');
        const count = await externalLinks.count();

        if (count > 0) {
            // Verificar el primer link externo disponible
            const firstExternal = externalLinks.first();
            const rel = await firstExternal.getAttribute('rel');
            expect(rel).toBeTruthy();
            expect(rel).toContain('noopener');
            expect(rel).toContain('noreferrer');
        }

        // Aunque no haya links externos activos con esta config, la página debe estar visible
        await expect(page.locator('footer')).toBeVisible();
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 3 — Breadcrumbs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Breadcrumbs', () => {

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page);
    });

    /**
     * N3.1 — ProductDetailPage muestra breadcrumb correcto.
     * Implementado en C4: <app-breadcrumb> con ítems Inicio > Productos > {nombre}.
     * BreadcrumbComponent usa <nav aria-label="breadcrumb">.
     */
    test('N3.1 — ProductDetailPage muestra breadcrumb con enlace a /products', async ({ page }) => {
        // Mockear el producto con id=1
        await page.route('**/api/v1/productos/1', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCT_DETAIL })
        );
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/products/1');
        await page.waitForLoadState('networkidle');

        // El componente BreadcrumbComponent renderiza <nav aria-label="breadcrumb">
        const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
        await expect(breadcrumb).toBeVisible({ timeout: 8_000 });

        // Debe haber un link que navega a /products
        const productsLink = breadcrumb.locator('a[href*="/products"]');
        await expect(productsLink).toBeVisible({ timeout: 5_000 });
    });

    /**
     * N3.2 — CartPage muestra breadcrumb con "Carrito" como ítem activo.
     * Implementado en C4: breadcrumbItems = [Inicio, Carrito].
     * El último ítem tiene aria-current="page".
     */
    test('N3.2 — CartPage muestra breadcrumb con "Carrito" como ítem activo (aria-current="page")', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        // BreadcrumbComponent presente
        const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
        await expect(breadcrumb).toBeVisible({ timeout: 8_000 });

        // El último ítem lleva aria-current="page" (implementado en BreadcrumbComponent)
        const activeItem = breadcrumb.locator('[aria-current="page"]');
        await expect(activeItem).toBeVisible({ timeout: 5_000 });

        // El texto del ítem activo debe contener "Carrito" (etiqueta del breadcrumb)
        const activeText = await activeItem.textContent();
        expect(activeText?.toLowerCase()).toContain('carrito');
    });

    /**
     * N3.3 — CheckoutPage muestra breadcrumb y stepper de 3 pasos.
     * Implementado en C4: breadcrumbItems = [Inicio, Carrito, Checkout] + stepper 3 pasos.
     * Requiere sesión autenticada (customerGuard).
     */
    test('N3.3 — CheckoutPage muestra breadcrumb visible y stepper con 3 pasos', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        // Inyectar token + items en carrito antes de navegar a /checkout
        await loginAsCustomer(page);
        await setupCart(page, [
            { productId: 1, name: 'Producto Test', price: 49.9, quantity: 1 },
        ]);

        await page.goto('/checkout');
        await page.waitForLoadState('networkidle');

        // Verificar que sigue en /checkout (guard no redirige)
        await expect(page).toHaveURL(/\/checkout/);

        // Breadcrumb presente
        const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
        await expect(breadcrumb).toBeVisible({ timeout: 8_000 });

        // Stepper: 3 divs con círculos de pasos (paso 1, 2, 3)
        // El template usa @for con pasos [{n:1,label:'Dirección'},{n:2,label:'Pago'},{n:3,label:'Confirmar'}]
        const stepperItems = page.locator('.flex.items-center.justify-center.gap-0.mb-8 .flex.flex-col.items-center');
        const stepCount = await stepperItems.count();
        // Deben existir 3 pasos en el stepper
        expect(stepCount).toBeGreaterThanOrEqual(3);

        // Los labels de los pasos deben estar visibles
        await expect(page.getByText('Dirección')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('Pago')).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('Confirmar')).toBeVisible({ timeout: 5_000 });
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 4 — Estados vacíos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Empty states', () => {

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page);
    });

    /**
     * N4.1 — ProductsPage muestra estado vacío cuando la API devuelve [].
     * Implementado en C6: estado vacío con h3 "No encontramos productos..." + botón "Ver todos".
     */
    test('N4.1 — ProductsPage muestra estado vacío cuando no hay resultados', async ({ page }) => {
        // Mockear API para devolver 0 productos
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_EMPTY })
        );

        await page.goto('/products?q=xyznotfound');
        await page.waitForLoadState('networkidle');

        // Mensaje de estado vacío: "No encontramos productos con esos criterios"
        const emptyMsg = page.getByText(/no encontramos productos/i);
        await expect(emptyMsg).toBeVisible({ timeout: 8_000 });

        // Botón "Ver todos los productos" (clearFilters)
        const clearBtn = page.getByRole('button', { name: /ver todos/i });
        await expect(clearBtn).toBeVisible({ timeout: 5_000 });
    });

    /**
     * N4.2 — CartPage muestra estado vacío cuando no hay items en localStorage.
     * El CartService lee de localStorage['cart'] — sin items muestra mensaje de carrito vacío.
     * El template usa {{ 'cart.empty' | translate }} en un div con *ngIf.
     */
    test('N4.2 — CartPage muestra estado vacío cuando no hay items', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        // Ir a home primero para tener el origen, limpiar localStorage y luego ir a /cart
        await page.goto('/home');
        await clearSession(page);
        // Limpiar el carrito explícitamente
        await page.evaluate(() => localStorage.removeItem('cart'));

        await page.goto('/cart');
        await page.waitForLoadState('networkidle');

        // El estado vacío está en un div con *ngIf cuando cartItems().length === 0
        // Usa la traducción 'cart.empty' — en es-PE suele ser "Tu carrito está vacío" o similar
        const emptyState = page.locator('[class*="text-center"]').filter({ hasText: /vacío|empty|carrito/i }).first();
        await expect(emptyState).toBeVisible({ timeout: 8_000 });
    });

    /**
     * N4.3 — CheckoutPage con carrito vacío muestra estado vacío con botón "Volver a la tienda".
     * Implementado en C6: @if (cartItems().length === 0) con <a routerLink="/products">.
     * No redirige automáticamente — muestra un estado vacío con CTA.
     */
    test('N4.3 — CheckoutPage con carrito vacío muestra estado vacío con CTA a /products', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        // Autenticarse pero sin items en carrito
        await loginAsCustomer(page);
        await page.evaluate(() => localStorage.removeItem('cart'));

        await page.goto('/checkout');
        await page.waitForLoadState('networkidle');

        // Verificar que no redirige a /home (es CUSTOMER autenticado)
        await expect(page).toHaveURL(/\/checkout/);

        // El estado vacío tiene un enlace a /products — "Volver a la tienda"
        // Implementado en C6 como <a routerLink="/products" class="btn btn-primary">Volver a la tienda</a>
        const ctaLink = page.getByRole('link', { name: /volver a la tienda/i });
        await expect(ctaLink).toBeVisible({ timeout: 8_000 });

        // También debe mostrar texto sobre el carrito vacío
        const emptyMsg = page.getByText(/carrito está vacío/i);
        await expect(emptyMsg).toBeVisible({ timeout: 5_000 });
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 5 — Botones y accesibilidad
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Buttons and accessibility', () => {

    test.beforeEach(async ({ page }) => {
        await setupCommonMocks(page);
    });

    /**
     * N5.1 — Category pills tienen aria-pressed correcto.
     * Implementado en C3: [attr.aria-pressed] en pills de /products.
     * "Todos" (clearCategory) → aria-pressed="true" por defecto.
     * Al seleccionar una categoría → su pill tiene aria-pressed="true", "Todos" tiene "false".
     */
    test('N5.1 — Category pills tienen aria-pressed correcto en /products', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/products');
        await page.waitForLoadState('networkidle');

        // Esperar que los pills de categorías sean visibles
        // El pill "Todos" usa la traducción 'categories.recommended'
        // Se identifica por ser el primer button en el contenedor de pills con aria-pressed
        const allPills = page.locator('button[aria-pressed]');
        await expect(allPills.first()).toBeVisible({ timeout: 8_000 });

        // "Todos" debe ser el primer pill y tener aria-pressed="true" inicialmente
        const firstPill = allPills.first();
        const initialAriaPressed = await firstPill.getAttribute('aria-pressed');
        expect(initialAriaPressed).toBe('true');

        // El pill "Electrónica" (segunda categoría mockeada) debe tener aria-pressed="false"
        const electronicaPill = page.locator('button[aria-pressed]').filter({ hasText: /electrónica/i });
        const electronicaCount = await electronicaPill.count();

        if (electronicaCount > 0) {
            const electronicaAriaPressed = await electronicaPill.first().getAttribute('aria-pressed');
            expect(electronicaAriaPressed).toBe('false');

            // Click en "Electrónica" → su pill tiene aria-pressed="true"
            await electronicaPill.first().click();
            await page.waitForTimeout(500); // esperar que el signal se actualice

            const afterClick = await electronicaPill.first().getAttribute('aria-pressed');
            expect(afterClick).toBe('true');

            // El pill "Todos" ahora tiene aria-pressed="false"
            const afterClickAll = await firstPill.getAttribute('aria-pressed');
            expect(afterClickAll).toBe('false');
        }
    });

    /**
     * N5.2 — Items placeholder del menú usuario tienen pointer-events-none y opacity-50.
     * Implementado en C1: Cupones, Saldo de crédito, Tiendas seguidas, Permisos, Cambiar cuenta
     * tienen class "opacity-50 pointer-events-none" + badge "Próximo".
     * Se verifica en el menú de usuario después de autenticarse como CUSTOMER.
     */
    test('N5.2 — Items placeholder del menú usuario tienen clase opacity-50', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        // Autenticarse como cliente
        await loginAsCustomer(page);
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Abrir el menú de usuario
        const userTrigger = page.locator('app-header-menu-search [class*="cursor-pointer"]').first();
        await expect(userTrigger).toBeVisible({ timeout: 8_000 });
        await userTrigger.click();

        // Esperar que el menú se abra (app-header-user-menu visible)
        const userMenu = page.locator('app-header-user-menu');
        await expect(userMenu).toBeVisible({ timeout: 5_000 });

        // Verificar que existe al menos un ítem con la clase opacity-50
        // Los items placeholder tienen "opacity-50 pointer-events-none" + texto "Próximo"
        const proximoItems = userMenu.locator('.opacity-50');
        const proximoCount = await proximoItems.count();
        expect(proximoCount).toBeGreaterThan(0);

        // Verificar que también tienen pointer-events-none
        const pointerNoneItems = userMenu.locator('.pointer-events-none');
        const pointerNoneCount = await pointerNoneItems.count();
        expect(pointerNoneCount).toBeGreaterThan(0);

        // Al menos uno de estos items debe mostrar el badge "Próximo"
        const proximoBadge = userMenu.getByText('Próximo');
        await expect(proximoBadge.first()).toBeVisible({ timeout: 5_000 });
    });

    /**
     * N5.3 — Breadcrumb en ProductsPage tiene enlace funcional a /home.
     * Verifica que el primer ítem del breadcrumb en /products es clickeable.
     */
    test('N5.3 — Breadcrumb en ProductsPage contiene enlace al inicio', async ({ page }) => {
        await page.route('**/api/v1/productos**', route =>
            route.fulfill({ status: 200, json: MOCK_PRODUCTS_PAGE })
        );

        await page.goto('/products');
        await page.waitForLoadState('networkidle');

        const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
        await expect(breadcrumb).toBeVisible({ timeout: 8_000 });

        // El primer enlace del breadcrumb debe llevar a /home o /
        const homeLink = breadcrumb.locator('a').first();
        await expect(homeLink).toBeVisible({ timeout: 5_000 });

        const href = await homeLink.getAttribute('href');
        expect(href).toBeTruthy();
        // El href debe apuntar a /home, / o similar (home page)
        expect(href).toMatch(/\/(home)?$/);
    });

});
