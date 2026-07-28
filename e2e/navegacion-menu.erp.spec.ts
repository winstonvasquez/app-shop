import { test, expect, Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { MENU_GROUPS } from './fixtures/menu-routes';
import {
    DiagnosticsCollector,
    RouteDiagnostics,
    appendDiagnostics,
    esErrorFatalDeConsola,
    resetDiagnosticsLog,
    writeDiagnosticsReport,
} from './helpers/diagnostics.helper';

/**
 * Recorre el menú COMPLETO del ERP haciendo clic real en cada opción del sidebar
 * (no `goto`), con la sesión del superadmin.
 *
 * Reparto de responsabilidades:
 *  - el test de cada grupo falla si una vista no monta o lanza una excepción JS,
 *    que es un defecto del frontend;
 *  - los endpoints que responden 4xx/5xx se acumulan y los reporta un único test
 *    final, para tener el mapa completo del backend en una sola corrida en vez
 *    de un fallo por grupo que corta el recorrido.
 */

const LOG = 'test-results/navegacion-diagnostico.jsonl';
const REPORTE = 'test-results/navegacion-diagnostico.json';

/** Los 6 microservicios del ERP, para comprobar que ninguno murió durante el recorrido. */
const PUERTOS: Record<string, number> = {
    users: 8080,
    ventas: 8081,
    compras: 8083,
    finanzas: 8084,
    analitica: 8087,
    logistica: 8090,
};

/** Deja la página en el dashboard admin con el sidebar visible. */
async function volverAlAdmin(page: Page): Promise<void> {
    if (!page.url().includes('/admin')) {
        await page.goto('/admin/dashboard');
    }
    await expect(page.locator('aside.sidebar-container')).toBeVisible({ timeout: 20_000 });
}

function escaparRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deja visible el enlace de una opción del menú: el sidebar es un acordeón con un
 * solo grupo abierto a la vez, así que basta con abrir el grupo que la contiene.
 */
async function mostrarOpcion(page: Page, titulo: string, route: string) {
    const enlace = page.locator(`.group-items-list a[href="${route}"]`).first();
    if ((await enlace.count()) === 0) {
        await page.locator('.group-header').filter({ hasText: new RegExp(`^${escaparRegex(titulo)}$`) }).first().click();
    }
    await expect(enlace, `la opción "${route}" debe verse tras abrir "${titulo}"`).toBeVisible({ timeout: 10_000 });
    return enlace;
}

/**
 * Espera a que la vista termine de montar. La lista incluye la raíz del POS
 * (`.pos-layout`), que no usa la cáscara del admin y por tanto no tiene ni
 * `.page-title` ni `app-data-table`.
 */
async function esperarRender(page: Page): Promise<void> {
    const contenido = page.locator(
        '.page-title, .page-header h1, h1, h2, .dashboard-content h2, app-data-table, .card, .empty-state,' +
        ' .pos-layout, app-pos-pin-login, .table-toolbar',
    );
    await expect(contenido.first()).toBeVisible({ timeout: 25_000 });
}

function leerDiagnosticos(): RouteDiagnostics[] {
    if (!existsSync(LOG)) return [];
    return readFileSync(LOG, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l) as RouteDiagnostics);
}

test.describe('Navegación del menú del ERP', () => {
    test('el sidebar muestra todos los grupos habilitados para el superadmin', async ({ page }) => {
        resetDiagnosticsLog(LOG);
        await page.goto('/admin/dashboard');
        await expect(page.locator('aside.sidebar-container')).toBeVisible({ timeout: 30_000 });

        for (const grupo of MENU_GROUPS) {
            await expect(
                page.locator('.group-header').filter({ hasText: new RegExp(`^${escaparRegex(grupo.title)}$`) }),
                `el grupo "${grupo.title}" debe estar en el sidebar`,
            ).toHaveCount(1);
        }
    });

    for (const grupo of MENU_GROUPS) {
        test(`grupo "${grupo.title}" — ${grupo.items.length} opción(es)`, async ({ page }) => {
            test.setTimeout(60_000 + grupo.items.length * 30_000);

            const diag = new DiagnosticsCollector(page);
            const noMontan: string[] = [];

            for (const item of grupo.items) {
                await volverAlAdmin(page);
                const enlace = await mostrarOpcion(page, grupo.title, item.route);

                diag.reset();
                await enlace.click();
                await page.waitForURL(url => url.toString().includes(item.route), { timeout: 25_000 });

                // La sesión no puede caerse a mitad del recorrido.
                expect(page.url(), `"${item.label}" no debe redirigir al login`).not.toContain('/auth/login');

                try {
                    await esperarRender(page);
                } catch {
                    noMontan.push(`${item.label} (${item.route}): la vista no llegó a montar`);
                }
                await page.waitForTimeout(600); // margen para las llamadas que dispara el ngOnInit

                const snapshot = diag.snapshot(item.route, item.label);
                appendDiagnostics(LOG, snapshot);

                if (snapshot.pageErrors.length > 0) {
                    noMontan.push(`${item.label} (${item.route}): ${snapshot.pageErrors.join(' | ')}`);
                }

                // Angular escribe por consola los errores que ocurren dentro de su ciclo de
                // detección de cambios en vez de propagarlos a `window.onerror`, así que
                // `pageErrors` no los ve. Sin esta comprobación una vista puede renderizar
                // una lista vacía por un error de tipo y el test pasa en verde.
                const fatales = snapshot.consoleErrors.filter(esErrorFatalDeConsola);
                if (fatales.length > 0) {
                    noMontan.push(`${item.label} (${item.route}): ${fatales.join(' | ').slice(0, 400)}`);
                }
            }

            expect(noMontan.join('\n'), `vistas con fallo de frontend en "${grupo.title}"`).toBe('');
        });
    }

    test('resumen: ningún endpoint del ERP responde con error', async ({ request }) => {
        const filas = leerDiagnosticos();
        expect(filas.length, 'el recorrido debe haber registrado rutas').toBeGreaterThan(0);
        writeDiagnosticsReport(REPORTE, filas);

        // Un microservicio que muere a mitad del recorrido hace que el proxy del dev-server
        // devuelva 500 en TODOS sus endpoints, y el informe pasa a acusar decenas de bugs
        // inexistentes. Se comprueba la salud al terminar para distinguir las dos cosas: los
        // servicios de este ERP mueren de vez en cuando sin dejar rastro en su log (gotcha
        // conocido de JDK 22), así que el diagnóstico tiene que decirlo explícitamente.
        // Se pregunta sólo si el PROCESO responde, no si la ruta existe: ventas, compras y
        // analítica montan el actuator bajo su context-path, así que un 404 en
        // `/actuator/health` es una respuesta válida de un servicio perfectamente vivo.
        // Lo único que indica un proceso muerto es que la conexión no se establezca.
        const caidos: string[] = [];
        for (const [nombre, puerto] of Object.entries(PUERTOS)) {
            try {
                await request.get(`http://127.0.0.1:${puerto}/actuator/health`, { timeout: 8_000 });
            } catch {
                caidos.push(`${nombre}:${puerto} (sin respuesta)`);
            }
        }
        expect(caidos.join(', '),
            'servicios caídos al terminar el recorrido — los 5xx de abajo son consecuencia de esto, ' +
            'no defectos de endpoint; reinícialos y vuelve a correr antes de diagnosticar nada')
            .toBe('');

        const rotos = new Map<string, { status: number; rutas: Set<string> }>();
        for (const fila of filas) {
            for (const fallo of fila.httpFailures) {
                const clave = `${fallo.status} ${fallo.method} ${fallo.url.replace(/https?:\/\/[^/]+/, '').split('?')[0]}`;
                if (!rotos.has(clave)) rotos.set(clave, { status: fallo.status, rutas: new Set() });
                rotos.get(clave)!.rutas.add(fila.route);
            }
        }

        const detalle = [...rotos.entries()]
            .sort((a, b) => b[1].status - a[1].status)
            .map(([clave, info]) => `${clave}\n      usado por: ${[...info.rutas].join(', ')}`)
            .join('\n');

        expect(detalle, `endpoints con error durante el recorrido de ${filas.length} vistas`).toBe('');
    });
});
