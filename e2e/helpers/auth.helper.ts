import { Page } from '@playwright/test';

/**
 * Clave de localStorage donde AuthService guarda el token JWT.
 * Definida en auth.service.ts: const TOKEN_KEY = 'auth_token';
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Clave de localStorage donde ThemeService guarda el tema activo.
 * Definida en theme.ts: const SHOP_THEME_KEY = 'shop_theme';
 */
const SHOP_THEME_KEY = 'shop_theme';

// ─── JWT helpers ─────────────────────────────────────────────────────────────

/**
 * Genera un JWT firmado con firma falsa (solo para tests E2E).
 * El payload es base64url-encoded y decodificado por AuthService.loadUserFromStorage().
 * exp: 1 hora desde ahora.
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const body = btoa(JSON.stringify({ exp, ...payload }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const signature = 'fake_signature_for_e2e_tests';
    return `${header}.${body}.${signature}`;
}

/**
 * Token de cliente: rol CUSTOMER, companyId 1, userId 100.
 * La tienda pública y rutas /account requieren este rol.
 */
const CUSTOMER_TOKEN = buildFakeJwt({
    sub: 'cliente@test.com',
    userId: 100,
    companyId: 1,
    role: 'CUSTOMER',
});

/**
 * Token de admin: rol ADMIN, companyId 1, userId 1.
 * Las rutas /admin requieren este rol.
 */
const ADMIN_TOKEN = buildFakeJwt({
    sub: 'admin@test.com',
    userId: 1,
    companyId: 1,
    role: 'ADMIN',
});

// ─── Inyectores de sesión ─────────────────────────────────────────────────────

/**
 * Inyecta un token de cliente en localStorage.
 * Llama a page.goto() con la ruta deseada DESPUÉS de este helper.
 *
 * Ejemplo:
 *   await loginAsCustomer(page);
 *   await page.goto('/home');
 */
export async function loginAsCustomer(page: Page): Promise<void> {
    // Necesitamos al menos cargar el origen antes de acceder a localStorage
    await page.goto('/');
    await page.evaluate(
        ([key, token]) => { localStorage.setItem(key, token); },
        [AUTH_TOKEN_KEY, CUSTOMER_TOKEN],
    );
}

/**
 * Inyecta un token de admin en localStorage.
 * Llama a page.goto() con la ruta deseada DESPUÉS de este helper.
 *
 * Ejemplo:
 *   await loginAsAdmin(page);
 *   await page.goto('/admin/store-theme');
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(
        ([key, token]) => { localStorage.setItem(key, token); },
        [AUTH_TOKEN_KEY, ADMIN_TOKEN],
    );
}

/**
 * Inyecta items en el carrito (clave 'cart' usada por CartService).
 * Debe llamarse después de loginAsCustomer() o loginAsAdmin() para que
 * el contexto de página ya esté cargado.
 *
 * @param items - Array de objetos CartItem (productId, quantity, price, name, etc.)
 */
export async function setupCart(page: Page, items: CartItem[]): Promise<void> {
    await page.evaluate(
        (cartData) => { localStorage.setItem('cart', JSON.stringify(cartData)); },
        items,
    );
}

// ─── Tipos compartidos ────────────────────────────────────────────────────────

/** Estructura mínima de un ítem de carrito compatible con CartService */
export interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

// ─── Helper heredado (compatibilidad con D1, D2, D3) ─────────────────────────

/**
 * Helper original: autentica via formulario de login.
 * Mantener para compatibilidad con flujo-ventas-online.spec.ts y otros specs.
 */
export async function loginAs(page: Page, username = 'admin', password = '12345678') {
    await page.goto('/auth/login');
    await page.getByLabel(/usuario|email|username/i).fill(username);
    await page.getByLabel(/contraseña|password/i).fill(password);
    await page.getByRole('button', { name: /ingresar|iniciar|login|sign.?in/i }).click();
    await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15_000 });
}

export async function ensureLoggedIn(page: Page) {
    const token = await page.evaluate(() =>
        localStorage.getItem('token') ?? localStorage.getItem('auth_token')
    );
    if (!token) {
        await loginAs(page);
    }
}

/** Limpia toda la sesión (auth_token + shop_theme + cart) */
export async function clearSession(page: Page): Promise<void> {
    await page.evaluate(([authKey, themeKey]) => {
        localStorage.removeItem(authKey);
        localStorage.removeItem(themeKey);
        localStorage.removeItem('cart');
    }, [AUTH_TOKEN_KEY, SHOP_THEME_KEY]);
}
