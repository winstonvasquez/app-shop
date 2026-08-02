import { test, expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Barrido de los módulos de Logística y Tesorería: entra en cada pantalla y falla
 * si el backend responde con error o si la vista pinta una alerta de error.
 *
 * Existe porque el usuario reportó errores en Envíos, Rutas y Transportistas, y
 * un escáner de compilación no ve nada de esto: son respuestas HTTP en runtime.
 *
 * IMPORTANTE: exige que los 6 microservicios estén ARRIBA. Un servicio detenido
 * hace que el proxy del dev-server devuelva 500 en TODAS las pantallas de su
 * módulo, y eso se confunde con un defecto de endpoint.
 */

interface Vista {
    nombre: string;
    ruta: string;
}

const LOGISTICA: Vista[] = [
    { nombre: 'Dashboard Logístico', ruta: '/admin/logistica/dashboard' },
    { nombre: 'Envíos', ruta: '/admin/logistica/envios' },
    { nombre: 'Tracking', ruta: '/admin/logistica/tracking' },
    { nombre: 'Rutas de Entrega', ruta: '/admin/logistica/rutas' },
    { nombre: 'Guías de Remisión', ruta: '/admin/logistica/guias' },
    { nombre: 'Transportistas', ruta: '/admin/logistica/transportistas' },
    { nombre: 'SLA Transportistas', ruta: '/admin/logistica/transportistas-sla' },
    { nombre: 'Devoluciones', ruta: '/admin/logistica/devoluciones' },
    { nombre: 'Batch Picking', ruta: '/admin/logistica/batch-picking' },
    { nombre: 'Picking Móvil', ruta: '/admin/logistica/picking-mobile' },
    { nombre: 'Reservas de Stock', ruta: '/admin/logistica/stock-reservations' },
    { nombre: 'KPI Logísticos', ruta: '/admin/logistica/kpi' },
    { nombre: 'Notificaciones', ruta: '/admin/logistica/notificaciones' },
    { nombre: 'Mapeo Contable', ruta: '/admin/logistica/mapeo-contable' },
];

const TESORERIA: Vista[] = [
    { nombre: 'Dashboard Tesorería', ruta: '/admin/tesoreria/dashboard' },
    { nombre: 'Control de Cajas', ruta: '/admin/tesoreria/cajas' },
    { nombre: 'Cuentas Bancarias', ruta: '/admin/tesoreria/cuentas-bancarias' },
    { nombre: 'Pagos / Workflow', ruta: '/admin/tesoreria/pagos' },
    { nombre: 'Flujo de Caja', ruta: '/admin/tesoreria/flujo-caja' },
];

interface Fallo {
    tipo: 'http' | 'alerta' | 'consola';
    detalle: string;
}

/** Entra en la vista y devuelve todo lo que salió mal. */
async function revisar(page: Page, vista: Vista): Promise<Fallo[]> {
    const fallos: Fallo[] = [];

    const onResponse = (r: { status: () => number; url: () => string }) => {
        const s = r.status();
        // Un 401/403 al vuelo puede ser una llamada pre-auth legítima; ≥400 del propio
        // API del ERP no lo es.
        if (s >= 400 && /\/(logistics|inventory|finance|treasury|sales|users|purchases)\//.test(r.url())) {
            fallos.push({ tipo: 'http', detalle: `${s} ${r.url()}` });
        }
    };
    const onPageError = (e: Error) => fallos.push({ tipo: 'consola', detalle: e.message });

    page.on('response', onResponse);
    page.on('pageerror', onPageError);

    await page.goto(vista.ruta, { waitUntil: 'domcontentloaded' });
    // Las tablas cargan tras el primer render; se espera a que la red se calme.
    // `networkidle` no llega nunca en las vistas con poller: se espera un margen fijo.
    await page.waitForTimeout(1500);

    // La vista puede tragarse el error HTTP y pintar una alerta: también cuenta.
    const alertas = page.locator('app-alert, .alert-error, [class*="alert"][class*="error"]');
    const total = await alertas.count();
    for (let i = 0; i < total; i++) {
        const texto = (await alertas.nth(i).innerText().catch(() => ''))?.trim();
        if (texto && /error|failure|500|400|no se pudo|fall/i.test(texto)) {
            fallos.push({ tipo: 'alerta', detalle: texto.slice(0, 200) });
        }
    }

    page.off('response', onResponse);
    page.off('pageerror', onPageError);
    return fallos;
}

test.describe('Barrido de Logística y Tesorería', () => {
    // Un módulo entero por test: si falla, el mensaje dice qué vistas y por qué.
    for (const [modulo, vistas] of [['Logística', LOGISTICA], ['Tesorería', TESORERIA]] as const) {
        test(`${modulo} — ninguna vista responde con error`, async ({ page }) => {
            test.setTimeout(600_000);
            const rotas = new Map<string, Fallo[]>();

            // El reporter recorta los mensajes largos y un timeout del test perdería
            // todo el diagnóstico: se vuelca a disco tras CADA vista.
            const destino = `test-results/barrido-${modulo.toLowerCase().replace(/[^a-z]/g, '')}.json`;
            mkdirSync('test-results', { recursive: true });

            for (const vista of vistas) {
                const fallos = await revisar(page, vista);
                if (fallos.length > 0) rotas.set(`${vista.nombre} (${vista.ruta})`, fallos);
                writeFileSync(destino, JSON.stringify(Object.fromEntries(rotas), null, 2), 'utf-8');
            }

            const resumen = [...rotas.entries()]
                .map(([v, fs]) => `${v}\n    ${fs.map(f => `[${f.tipo}] ${f.detalle}`).join('\n    ')}`)
                .join('\n  ');

            expect(resumen, `Vistas con error en ${modulo}:\n  ${resumen}`).toBe('');
        });
    }
});
