const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = 'playwright-screenshots';
const CREDENTIALS = { username: 'admin', password: '12345678' };

// Routes to test (Angular routes from the app)
const ROUTES = [
  { path: '/auth/login', name: '00-login', requiresAuth: false },
  { path: '/', name: '01-home', requiresAuth: true },
  { path: '/admin', name: '02-admin', requiresAuth: true },
  { path: '/admin/dashboard', name: '03-admin-dashboard', requiresAuth: true },
  { path: '/admin/products', name: '04-admin-products', requiresAuth: true },
  { path: '/admin/categories', name: '05-admin-categories', requiresAuth: true },
  { path: '/admin/companies', name: '06-admin-companies', requiresAuth: true },
  { path: '/admin/users', name: '07-admin-users', requiresAuth: true },
  { path: '/admin/orders', name: '08-admin-orders', requiresAuth: true },
  { path: '/pos', name: '09-pos', requiresAuth: true },
  { path: '/pos/dashboard', name: '10-pos-dashboard', requiresAuth: true },
  { path: '/cart', name: '11-cart', requiresAuth: true },
  { path: '/checkout', name: '12-checkout', requiresAuth: true },
  { path: '/shop', name: '13-shop', requiresAuth: true },
  { path: '/products', name: '14-products', requiresAuth: true },
];

async function doLogin(page) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState('networkidle');

  await page.locator('input[name="username"], input[formcontrolname="username"]').fill(CREDENTIALS.username);
  await page.locator('input[name="password"], input[formcontrolname="password"], input[type="password"]').fill(CREDENTIALS.password);
  await page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Login"), button:has-text("Entrar")').first().click();

  try {
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 10000 });
    console.log('✅ Login exitoso, URL:', page.url());
    return true;
  } catch(e) {
    console.log('❌ Login falló o no redirigió:', e.message.substring(0, 100));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/00-login-failed.png`, fullPage: true });
    return false;
  }
}

async function testRoute(page, route, allErrors, results) {
  const routeErrors = [];
  const routeNetworkErrors = [];

  const consoleListener = msg => {
    if (msg.type() === 'error') {
      routeErrors.push(msg.text());
      allErrors.push({ route: route.path, error: msg.text() });
    }
  };
  const pageErrorListener = err => {
    routeErrors.push('PAGE ERROR: ' + err.message);
    allErrors.push({ route: route.path, error: 'PAGE ERROR: ' + err.message });
  };
  const responseListener = response => {
    if (response.status() >= 400 && response.status() !== 401) {
      routeNetworkErrors.push(`${response.status()} ${response.url()}`);
    }
  };

  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);
  page.on('response', responseListener);

  try {
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
  } catch(e) {
    console.log(`  ⚠️  Timeout/error navegando a ${route.path}: ${e.message.substring(0, 80)}`);
  }

  // Wait a bit for lazy loaded content
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  const redirected = !finalUrl.includes(route.path) && route.path !== '/';

  // Check for error indicators in page
  const has404 = await page.locator(':text("404"), :text("No encontrado"), :text("Not Found")').count() > 0;
  const hasError = await page.locator(':text("Error"), :text("error occurred")').count() > 0;

  // Get page title
  const title = await page.title().catch(() => 'N/A');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/${route.name}.png`, fullPage: true });

  const result = {
    route: route.path,
    name: route.name,
    finalUrl,
    redirected,
    redirectedTo: redirected ? finalUrl.replace(BASE_URL, '') : null,
    consoleErrors: routeErrors,
    networkErrors: routeNetworkErrors,
    has404,
    hasError,
    title,
    status: redirected ? 'REDIRECTED' : (has404 ? 'NOT_FOUND' : 'OK')
  };

  results.push(result);

  const icon = result.status === 'OK' ? '✅' : (result.status === 'REDIRECTED' ? '↩️' : '❌');
  console.log(`  ${icon} ${route.path} → ${result.status} ${result.redirectedTo ? '(→ ' + result.redirectedTo + ')' : ''} | Errors: ${routeErrors.length} | Net: ${routeNetworkErrors.length}`);
  if (routeErrors.length) {
    routeErrors.slice(0,2).forEach(e => console.log(`      🔴 ${e.substring(0, 120)}`));
  }
  if (routeNetworkErrors.length) {
    routeNetworkErrors.slice(0,2).forEach(e => console.log(`      🟡 NET: ${e.substring(0, 120)}`));
  }

  page.off('console', consoleListener);
  page.off('pageerror', pageErrorListener);
  page.off('response', responseListener);

  return result;
}

async function discoverMenuLinks(page) {
  // Try to discover navigation links from the page
  const links = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a[routerLink], a[href], nav a, [class*="menu"] a, [class*="nav"] a, [class*="sidebar"] a')];
    return anchors
      .map(a => ({ href: a.getAttribute('href') || a.getAttribute('routerlink'), text: a.textContent?.trim() }))
      .filter(l => l.href && l.href.startsWith('/') && !l.href.includes('#'))
      .filter((l, i, arr) => arr.findIndex(x => x.href === l.href) === i)
      .slice(0, 30);
  });
  return links;
}

(async () => {
  console.log('=== MicroShop QA - Playwright Explorer ===\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const allErrors = [];
  const results = [];

  // Step 1: Login
  console.log('📋 PASO 1: Login');
  const loginSuccess = await doLogin(page);

  if (!loginSuccess) {
    console.log('Login falló. Tomando screenshot y saliendo.');
    await browser.close();
    process.exit(1);
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-after-login.png`, fullPage: true });
  console.log('  Screenshot post-login guardado.\n');

  // Step 2: Discover links from main navigation
  console.log('📋 PASO 2: Descubrir links de navegación');
  const discoveredLinks = await discoverMenuLinks(page);
  console.log('  Links encontrados en nav:', discoveredLinks.length);
  discoveredLinks.forEach(l => console.log(`    - ${l.href} (${l.text})`));

  // Add discovered routes that aren't already in our list
  const knownPaths = new Set(ROUTES.map(r => r.path));
  let idx = ROUTES.length;
  for (const link of discoveredLinks) {
    if (!knownPaths.has(link.href)) {
      ROUTES.push({ path: link.href, name: `${String(idx++).padStart(2,'0')}-discovered-${link.href.replace(/\//g,'-').substring(1)}`, requiresAuth: true });
      knownPaths.add(link.href);
    }
  }
  console.log('  Total rutas a probar:', ROUTES.length, '\n');

  // Step 3: Test all routes
  console.log('📋 PASO 3: Probando todas las rutas');
  for (const route of ROUTES) {
    if (route.path === '/auth/login') {
      // Skip re-login during auth test
      continue;
    }
    await testRoute(page, route, allErrors, results);
  }

  // Step 4: Try to navigate via sidebar/menu items
  console.log('\n📋 PASO 4: Exploración de menú lateral desde /admin');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const adminLinks = await discoverMenuLinks(page);
  console.log('  Links en /admin:', adminLinks.length);
  adminLinks.forEach(l => console.log(`    - ${l.href} (${l.text})`));

  // Screenshot of admin with sidebar visible
  await page.screenshot({ path: `${SCREENSHOT_DIR}/admin-sidebar.png`, fullPage: true });

  // Step 5: Try POS page
  console.log('\n📋 PASO 5: Exploración POS');
  await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/pos-full.png`, fullPage: true });
  const posLinks = await discoverMenuLinks(page);
  console.log('  Links en /pos:', posLinks.length);
  posLinks.forEach(l => console.log(`    - ${l.href} (${l.text})`));

  // Step 6: Final report
  console.log('\n\n========= REPORTE FINAL =========');
  console.log(`Total rutas probadas: ${results.length}`);

  const ok = results.filter(r => r.status === 'OK');
  const redirected = results.filter(r => r.status === 'REDIRECTED');
  const notFound = results.filter(r => r.status === 'NOT_FOUND');
  const withErrors = results.filter(r => r.consoleErrors.length > 0);

  console.log(`✅ OK: ${ok.length}`);
  console.log(`↩️  Redirigidos: ${redirected.length}`);
  console.log(`❌ Not Found: ${notFound.length}`);
  console.log(`🔴 Con errores de consola: ${withErrors.length}`);

  if (redirected.length) {
    console.log('\n--- RUTAS REDIRIGIDAS ---');
    redirected.forEach(r => console.log(`  ${r.route} → ${r.redirectedTo}`));
  }

  if (notFound.length) {
    console.log('\n--- RUTAS NO ENCONTRADAS (404) ---');
    notFound.forEach(r => console.log(`  ${r.route}`));
  }

  if (withErrors.length) {
    console.log('\n--- ERRORES DE CONSOLA POR RUTA ---');
    withErrors.forEach(r => {
      console.log(`  ${r.route}:`);
      r.consoleErrors.forEach(e => console.log(`    - ${e.substring(0, 150)}`));
    });
  }

  const uniqueErrors = [...new Set(allErrors.map(e => e.error))];
  if (uniqueErrors.length) {
    console.log('\n--- ERRORES ÚNICOS TOTALES ---');
    uniqueErrors.forEach(e => console.log(`  • ${e.substring(0, 200)}`));
  }

  console.log('\n--- SCREENSHOTS GENERADOS ---');
  const shots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  shots.forEach(s => console.log(`  ${SCREENSHOT_DIR}/${s}`));

  await browser.close();
  console.log('\n✅ QA completado.\n');
})();
