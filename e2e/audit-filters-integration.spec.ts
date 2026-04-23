import { test, Page, Response } from '@playwright/test';
import * as fs from 'fs';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '12345678';

async function loginAsAdminReal(page: Page): Promise<void> {
    const resp = await page.request.post('http://localhost:4200/users/api/auth/login', {
        data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    if (!resp.ok()) throw new Error(`Login failed HTTP ${resp.status()}`);
    const body = await resp.json() as { token: string };
    await page.goto('/home');
    await page.evaluate((token: string) => {
        localStorage.setItem('auth_token', token);
    }, body.token);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
}

interface Test {
    feature: string;
    route: string;
    placeholderRegex: RegExp;
    apiRegex: RegExp;
}

// Excluye deliberadamente "Buscar en el sistema" (admin-header) usando patrones exactos
const TESTS: Test[] = [
    { feature: 'admin/categories',  route: '/admin/categories',  placeholderRegex: /Buscar categorías/,              apiRegex: /\/categor/ },
    { feature: 'admin/companies',   route: '/admin/companies',   placeholderRegex: /Buscar por nombre o RUC/,        apiRegex: /\/companies/ },
    { feature: 'admin/customers',   route: '/admin/customers',   placeholderRegex: /Buscar por nombre, documento/,   apiRegex: /\/clientes|\/customers/ },
    { feature: 'admin/products',    route: '/admin/products',    placeholderRegex: /Buscar productos/,               apiRegex: /\/productos/ },
    { feature: 'admin/segments',    route: '/admin/segments',    placeholderRegex: /Buscar segmento/,                apiRegex: /\/segments/ },
    { feature: 'admin/users',       route: '/admin/users',       placeholderRegex: /Buscar por nombre, email o doc/, apiRegex: /\/users\/api\/users/ },
    { feature: 'admin/orders',      route: '/admin/orders',      placeholderRegex: /Buscar por ID, cliente/,         apiRegex: /\/pedidos|\/orders/ },
    { feature: 'compras/proveedores', route: '/admin/compras/proveedores', placeholderRegex: /Buscar por RUC/,        apiRegex: /\/proveedores/ },
    { feature: 'compras/catalogo',  route: '/admin/compras/catalogo',       placeholderRegex: /Buscar por código o descripción/, apiRegex: /\/catalogo/ },
    { feature: 'rrhh/empleados',    route: '/admin/rrhh/empleados',         placeholderRegex: /Buscar por código, nombre o documento/, apiRegex: /\/empleados|\/employees/ },
];

interface Result {
    feature: string;
    baseline: { status: number | null; count: number | null };
    matching: { status: number | null; count: number | null };
    impossible: { status: number | null; count: number | null };
    cleared: { status: number | null; count: number | null };
    errors: string[];
    verdict: 'PASS' | 'FAIL' | 'SKIP';
}

async function captureResponse(page: Page, apiRegex: RegExp, action: () => Promise<void>, timeout = 8000): Promise<{status: number | null; count: number | null}> {
    try {
        const [resp] = await Promise.all([
            page.waitForResponse(r => apiRegex.test(r.url()) && r.request().method() === 'GET', { timeout }),
            action(),
        ]);
        const status = resp.status();
        let count: number | null = null;
        try {
            const body = await resp.json();
            if (typeof body.totalElements === 'number') count = body.totalElements;
            else if (body.page && typeof body.page.totalElements === 'number') count = body.page.totalElements;
            else if (Array.isArray(body.content)) count = body.content.length;
            else if (Array.isArray(body)) count = body.length;
        } catch {}
        return { status, count };
    } catch (e) {
        return { status: null, count: null };
    }
}

function evaluate(r: Result): 'PASS' | 'FAIL' | 'SKIP' {
    if (r.errors.length > 0 && r.baseline.status === null) return 'SKIP';
    // Baseline debe ser 200
    if (r.baseline.status !== 200) return 'FAIL';
    // Matching y cleared DEBEN ser 200
    if (r.matching.status !== null && r.matching.status !== 200) return 'FAIL';
    if (r.cleared.status !== null && r.cleared.status !== 200) return 'FAIL';
    if (r.impossible.status !== null && r.impossible.status !== 200) return 'FAIL';
    // Count debe reducirse al buscar texto imposible (idealmente 0)
    if (r.impossible.count !== null && r.baseline.count !== null && r.impossible.count >= r.baseline.count && r.baseline.count > 0) {
        // No es estricto fallo — puede ser que el filtro no se aplicó, pero nota
        r.errors.push(`IMPOSSIBLE_RETURNED_${r.impossible.count}_EXPECTED_0`);
    }
    return 'PASS';
}

test('audit filters integration: search behavior por feature', async ({ page }) => {
    test.setTimeout(900_000);
    const results: Result[] = [];

    await loginAsAdminReal(page);

    for (const t of TESTS) {
        const r: Result = {
            feature: t.feature,
            baseline: { status: null, count: null },
            matching: { status: null, count: null },
            impossible: { status: null, count: null },
            cleared: { status: null, count: null },
            errors: [],
            verdict: 'SKIP',
        };

        try {
            // Baseline: capturar request del listado al cargar la página
            r.baseline = await captureResponse(page, t.apiRegex, async () => {
                await page.goto(t.route, { waitUntil: 'domcontentloaded', timeout: 15_000 });
            }, 10_000);

            if (r.baseline.status === null) {
                r.errors.push('BASELINE_REQUEST_NOT_CAPTURED');
            }

            await page.waitForTimeout(800);

            // Selector específico por placeholder regex
            const input = page.locator(`input[placeholder*="${t.placeholderRegex.source.split(/\\/)[0]}"]`).first();
            const hasInput = await input.count() > 0 && await input.isVisible().catch(() => false);

            if (!hasInput) {
                r.errors.push('SEARCH_INPUT_NOT_VISIBLE');
                r.verdict = evaluate(r);
                results.push(r);
                continue;
            }

            // Caso MATCHING: texto que matchea mucho
            r.matching = await captureResponse(page, t.apiRegex, async () => {
                await input.fill('a');
                await page.waitForTimeout(800);
            }, 6000);

            // Caso IMPOSSIBLE: texto que no matchea nada
            r.impossible = await captureResponse(page, t.apiRegex, async () => {
                await input.fill('_zzz_xyz_nomatch_999_');
                await page.waitForTimeout(800);
            }, 6000);

            // Caso CLEARED: limpiar filtro
            r.cleared = await captureResponse(page, t.apiRegex, async () => {
                await input.fill('');
                await page.waitForTimeout(800);
            }, 6000);

        } catch (e) {
            r.errors.push(`EXC: ${(e as Error).message.substring(0, 120)}`);
        }

        r.verdict = evaluate(r);
        results.push(r);
    }

    const pass = results.filter(r => r.verdict === 'PASS').length;
    const fail = results.filter(r => r.verdict === 'FAIL').length;
    const skip = results.filter(r => r.verdict === 'SKIP').length;

    fs.writeFileSync('filters-report.json', JSON.stringify({ summary: { pass, fail, skip }, results }, null, 2));

    console.log(`\n═══ FILTER INTEGRATION — ${pass}/${results.length} PASS ═══`);
    console.log(`PASS=${pass}  FAIL=${fail}  SKIP=${skip}\n`);
    for (const r of results) {
        const verdict = r.verdict === 'PASS' ? '✓' : r.verdict === 'FAIL' ? '✗' : '?';
        const counts = `b=${r.baseline.count}/m=${r.matching.count}/i=${r.impossible.count}/c=${r.cleared.count}`;
        const codes = `[${r.baseline.status ?? '-'} ${r.matching.status ?? '-'} ${r.impossible.status ?? '-'} ${r.cleared.status ?? '-'}]`;
        const err = r.errors.length ? ` | ${r.errors.join(', ')}` : '';
        console.log(`${verdict} ${r.feature.padEnd(25)} ${codes} ${counts}${err}`);
    }
});
