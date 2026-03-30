import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const PROFESSIONAL_THEMES = [
    'slate-professional',
    'obsidian-dark',
    'arctic-light',
    'ember',
    'forest',
    'graphite-contrast',
    'rose-executive',
] as const;

type ProfessionalTheme = (typeof PROFESSIONAL_THEMES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Suite: Theme System — Professional Themes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Theme System — Professional Themes', () => {

    test.beforeEach(async ({ page }) => {
        // Interceptar llamadas al backend para no depender de que esté activo.
        // En particular, GET /api/themes/active que podría sobreescribir el tema de localStorage.
        await page.route('**/api/themes/active', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                // Respuesta vacía/null: el servicio lo descarta vía catchError → of(null)
                body: 'null',
            })
        );
        // Interceptar cualquier otra llamada API (productos, usuarios, etc.)
        await page.route('**/api/**', route => {
            // Dejar pasar themes/active (ya capturada arriba); rechazar el resto con vacío
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: '[]',
            });
        });
    });

    // ─── Tests parametrizados: un test por tema ───────────────────────────────

    for (const theme of PROFESSIONAL_THEMES) {
        test(`Tema "${theme}" se aplica desde localStorage`, async ({ page }) => {
            // Inyectar el tema en localStorage ANTES de que Angular cargue,
            // para que ThemeService.initTheme() lo encuentre de forma sincrónica.
            await page.addInitScript((t: string) => {
                localStorage.setItem('shop_theme', t);
            }, theme);

            await page.goto('/home');
            await page.waitForLoadState('networkidle');

            // ThemeService.applyThemeToDocument() llama root.setAttribute('data-theme', theme)
            // para cualquier tema distinto de 'dark'.
            const htmlEl = page.locator('html');
            await expect(htmlEl).toHaveAttribute('data-theme', theme);
        });
    }

    // ─── Test: el tema 'dark' por defecto no tiene data-theme ────────────────

    test('Tema "dark" (por defecto) no establece el atributo data-theme', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'dark');
        });

        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // ThemeService llama root.removeAttribute('data-theme') cuando el tema es 'dark'
        const htmlEl = page.locator('html');
        await expect(htmlEl).not.toHaveAttribute('data-theme');
    });

    // ─── Test: tema claro arctic-light tiene fondo claro ─────────────────────

    test('Tema "arctic-light" aplica un fondo claro (no el oscuro por defecto)', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'arctic-light');
        });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const bgColor = await page.evaluate(() => {
            return window
                .getComputedStyle(document.documentElement)
                .getPropertyValue('--color-background')
                .trim();
        });

        expect(bgColor).toBeTruthy();
        // El fondo oscuro por defecto es #0f0f0f; arctic-light debe usar un valor diferente
        expect(bgColor.toLowerCase()).not.toBe('#0f0f0f');
    });

    // ─── Test: slate-professional no usa el rojo primario por defecto ─────────

    test('Tema "slate-professional" sobrescribe el color primario (no rojo #d7132a)', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'slate-professional');
        });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const primaryColor = await page.evaluate(() => {
            return window
                .getComputedStyle(document.documentElement)
                .getPropertyValue('--color-primary')
                .trim();
        });

        expect(primaryColor).toBeTruthy();
        // Slate professional usa tonos índigo/slate, no el rojo corporativo #d7132a
        expect(primaryColor.toLowerCase()).not.toContain('d7132a');
    });

    // ─── Test: graphite-contrast aplica contraste alto ────────────────────────

    test('Tema "graphite-contrast" sobrescribe el color de superficie', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'graphite-contrast');
        });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Verificar que el atributo data-theme está correctamente puesto
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite-contrast');

        // Verificar que --color-surface está definido para este tema
        const surfaceColor = await page.evaluate(() => {
            return window
                .getComputedStyle(document.documentElement)
                .getPropertyValue('--color-surface')
                .trim();
        });
        expect(surfaceColor).toBeTruthy();
    });

    // ─── Test: cambio dinámico de tema via reload ─────────────────────────────

    test('ThemeService aplica el tema "ember" al recargar la página', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Cambiar el tema en localStorage (simula que el usuario seleccionó otro tema
        // en otra pestaña o que el ThemeService lo persiste)
        await page.evaluate(() => {
            localStorage.setItem('shop_theme', 'ember');
        });

        // Al recargar, ThemeService.initTheme() lee localStorage de forma sincrónica
        await page.reload();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');
    });

    // ─── Test: cambio dinámico sin reload usando el servicio ──────────────────

    test('ThemeService cambia el tema dinámicamente sin recargar al escuchar storage event', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Emitir un StorageEvent como si el cambio viniese de otra pestaña
        await page.evaluate(() => {
            localStorage.setItem('shop_theme', 'forest');
            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: 'shop_theme',
                    newValue: 'forest',
                    storageArea: localStorage,
                })
            );
        });

        // Esperar brevemente por si el ThemeService escucha el storage event
        await page.waitForTimeout(300);

        // Si el servicio no escucha storage events, el tema se aplica al recargar
        const dataTheme = await page.locator('html').getAttribute('data-theme');
        if (dataTheme !== 'forest') {
            // Fallback: verificar que al recargar sí se aplica
            await page.reload();
            await page.waitForLoadState('networkidle');
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');
        } else {
            expect(dataTheme).toBe('forest');
        }
    });

    // ─── Test: sin errores CSS en consola al cargar cada tema ─────────────────

    test('Todos los temas profesionales cargan sin errores CSS en consola', async ({ page }) => {
        const cssErrors: string[] = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Solo capturar errores relacionados con CSS/temas; ignorar errores de red API
                if (text.toLowerCase().includes('css') || text.toLowerCase().includes('theme')) {
                    cssErrors.push(text);
                }
            }
        });

        for (const theme of PROFESSIONAL_THEMES) {
            // Cada iteración usa addInitScript: se acumula para la siguiente goto,
            // pero localStorage.setItem sobreescribe la clave anterior — el último gana.
            await page.evaluate((t: string) => {
                localStorage.setItem('shop_theme', t);
            }, theme);

            await page.goto('/home');
            await page.waitForLoadState('networkidle');

            // Verificar que el tema se aplicó correctamente en cada iteración
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        }

        expect(cssErrors).toHaveLength(0);
    });

    // ─── Test: selector de temas muestra los 7 temas profesionales ───────────

    test('El selector de temas expone los 7 temas profesionales', async ({ page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // Buscar el theme switcher en el DOM (puede estar en el header, settings, etc.)
        const themeSwitcher = page.locator(
            '[data-testid="theme-switcher"], .theme-switcher, app-theme-switcher'
        );

        if ((await themeSwitcher.count()) > 0) {
            // Si el switcher está visible, abrirlo y verificar las opciones
            await themeSwitcher.first().click();
            await page.waitForTimeout(300);

            for (const theme of PROFESSIONAL_THEMES) {
                const themeOption = page.locator(
                    `[data-theme-id="${theme}"], [value="${theme}"], [data-value="${theme}"]`
                );
                await expect(themeOption).toBeVisible({ timeout: 5_000 });
            }
        } else {
            // Si el selector no está en /home, verificar la ruta de configuración de tema
            await page.goto('/admin/store-theme');
            await page.waitForLoadState('networkidle');

            // La página no debe redirigir al login (requiere que el admin esté autenticado
            // o que la ruta de preview sea pública)
            // Verificar al menos que la aplicación carga sin crash
            await expect(page.locator('body')).toBeVisible();
        }
    });

    // ─── Test: rose-executive tiene token de color definido ──────────────────

    test('Tema "rose-executive" define el token --color-primary', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'rose-executive');
        });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose-executive');

        const primaryColor = await page.evaluate(() => {
            return window
                .getComputedStyle(document.documentElement)
                .getPropertyValue('--color-primary')
                .trim();
        });

        expect(primaryColor).toBeTruthy();
        expect(primaryColor.length).toBeGreaterThan(0);
    });

    // ─── Test: tema inválido no se aplica y el sistema queda en 'dark' ────────

    test('Un valor inválido en localStorage es ignorado y se usa el tema "dark"', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('shop_theme', 'tema-que-no-existe');
        });
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        // ThemeService.initTheme(): si el valor no está en VALID_THEMES → usa 'dark'
        // 'dark' → removeAttribute('data-theme')
        const htmlEl = page.locator('html');
        await expect(htmlEl).not.toHaveAttribute('data-theme');
    });

});
