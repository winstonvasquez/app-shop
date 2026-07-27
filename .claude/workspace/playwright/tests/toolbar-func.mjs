import { chromium } from 'playwright';
const BASE = 'http://localhost:4200';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 } })).newPage();

await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.fill('input[formControlName="username"]', 'admin');
await page.fill('input[formControlName="password"]', '12345678');
await page.click('#btn-login-submit');
await page.waitForURL('**/admin/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

const rowCount = () => page.evaluate(() => document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length);

// ── Proveedores: buscar por texto ──
await page.goto(`${BASE}/admin/compras/proveedores`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const before = await rowCount();
await page.fill('.table-search input', 'LENOVO');
await page.click('.table-search app-button button');
await page.waitForTimeout(2000);
const afterSearch = await rowCount();

// limpiar búsqueda
await page.fill('.table-search input', '');
await page.click('.table-search app-button button');
await page.waitForTimeout(1500);
const afterClear = await rowCount();

// ── Filtro por estado ──
await page.selectOption('.table-filter select', 'INACTIVO');
await page.waitForTimeout(2000);
const afterFilter = await rowCount();

console.log(JSON.stringify({ before, afterSearch, afterClear, afterFilter }, null, 2));
await browser.close();
