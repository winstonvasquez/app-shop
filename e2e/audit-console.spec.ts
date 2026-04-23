import { test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Auditoría dinámica de errores en consola y network durante navegación ERP
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '12345678';

async function loginAsAdminReal(page: Page): Promise<string> {
    const resp = await page.request.post('http://localhost:4200/users/api/auth/login', {
        data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    if (!resp.ok()) {
        throw new Error(`Login failed HTTP ${resp.status()}: ${await resp.text()}`);
    }
    const body = await resp.json() as { token: string };
    await page.goto('/home');
    await page.evaluate((token: string) => {
        localStorage.setItem('auth_token', token);
    }, body.token);
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    return body.token;
}

const ROUTES = [
    '/admin/dashboard',
    '/admin/products',
    '/admin/categories',
    '/admin/customers',
    '/admin/segments',
    '/admin/companies',
    '/admin/orders',
    '/admin/promotions',
    '/admin/returns',
    '/admin/transactions',
    '/admin/contabilidad/libro-diario',
    '/admin/contabilidad/libro-mayor',
    '/admin/contabilidad/presupuesto',
    '/admin/contabilidad/auditoria',
    '/admin/compras/proveedores',
    '/admin/compras/ordenes-compra',
    '/admin/compras/cotizaciones',
    '/admin/compras/solicitudes-compra',
    '/admin/logistica/almacenes',
    '/admin/logistica/movimientos',
    '/admin/logistica/inventario',
    '/admin/rrhh/empleados',
    '/admin/rrhh/vacaciones',
    '/admin/tesoreria/pagos',
    '/admin/tesoreria/cajas',
];

interface AuditIssue {
    route: string;
    type: 'console.error' | 'console.warning' | 'pageerror' | 'requestfailed' | 'response.error';
    message: string;
    url?: string;
    status?: number;
}

test('audit: capture console errors across main ERP routes', async ({ page }) => {
    test.setTimeout(600_000);
    const issues: AuditIssue[] = [];
    let currentRoute = '/';

    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            const text = msg.text();
            if (text.includes('favicon') || text.includes('chrome-extension')) return;
            issues.push({
                route: currentRoute,
                type: type === 'error' ? 'console.error' : 'console.warning',
                message: text.substring(0, 500),
            });
        }
    });

    page.on('pageerror', err => {
        issues.push({
            route: currentRoute,
            type: 'pageerror',
            message: `${err.name}: ${err.message}`.substring(0, 500),
        });
    });

    page.on('requestfailed', req => {
        const url = req.url();
        if (url.includes('favicon') || url.includes('sockjs') || url.includes('ng-cli-ws')) return;
        issues.push({
            route: currentRoute,
            type: 'requestfailed',
            message: `${req.method()} ${req.failure()?.errorText ?? 'failed'}`,
            url,
        });
    });

    page.on('response', async resp => {
        const url = resp.url();
        const status = resp.status();
        if (status < 400) return;
        if (url.includes('favicon') || url.includes('sockjs') || url.includes('chrome-extension')) return;
        issues.push({
            route: currentRoute,
            type: 'response.error',
            message: `HTTP ${status} ${resp.statusText()}`,
            url,
            status,
        });
    });

    await loginAsAdminReal(page);

    for (const route of ROUTES) {
        currentRoute = route;
        try {
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15_000 });
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            await page.waitForTimeout(800);
        } catch (err) {
            issues.push({
                route,
                type: 'pageerror',
                message: `navigation failed: ${(err as Error).message}`.substring(0, 500),
            });
        }
    }

    const reportPath = path.join(process.cwd(), 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ totalIssues: issues.length, issues }, null, 2));

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`AUDIT REPORT — ${issues.length} issues across ${ROUTES.length} routes`);
    console.log(`Full report: ${reportPath}`);
    console.log(`═══════════════════════════════════════════\n`);

    const byRoute = new Map<string, AuditIssue[]>();
    for (const issue of issues) {
        if (!byRoute.has(issue.route)) byRoute.set(issue.route, []);
        byRoute.get(issue.route)!.push(issue);
    }
    for (const [route, list] of byRoute) {
        console.log(`\n── ${route} (${list.length}) ──`);
        const seen = new Set<string>();
        for (const i of list) {
            const key = `${i.type}|${i.message}|${i.url ?? ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const suffix = i.url ? `  [${i.url}]` : '';
            console.log(`  [${i.type}] ${i.message}${suffix}`);
        }
    }
});
