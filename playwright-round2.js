const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const report = [];
  const consoleErrors = {};

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const url = page.url();
      if (!consoleErrors[url]) consoleErrors[url] = [];
      consoleErrors[url].push(msg.text().substring(0, 150));
    }
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      const url = page.url();
      if (!consoleErrors[url]) consoleErrors[url] = [];
      consoleErrors[url].push(`HTTP ${resp.status()} -> ${resp.url().replace('http://localhost:4200', '').replace('http://localhost:8080', '[8080]').replace('http://localhost:8081', '[8081]').replace('http://localhost:8083', '[8083]')}`);
    }
  });

  async function visit(path, label) {
    try {
      await page.goto('http://localhost:4200' + path, { waitUntil: 'networkidle', timeout: 12000 });
      const finalUrl = page.url().replace('http://localhost:4200', '');
      const redirected = !finalUrl.startsWith(path);
      const h1 = await page.locator('h1, .page-title').first().textContent({ timeout: 2000 }).catch(() => '');
      const errs = consoleErrors[page.url()] || [];
      report.push({ path, label, finalUrl, redirected, h1: h1.trim(), errors: errs.slice(0, 3) });
      console.log(`${redirected ? 'REDIRECT' : 'OK'} ${path} -> ${finalUrl} [${h1.trim()}]`);
      if (errs.length) errs.forEach(e => console.log(`  ERR: ${e}`));
    } catch(e) {
      report.push({ path, label, error: e.message.substring(0, 100) });
      console.log(`FAIL ${path} -> ERROR: ${e.message.substring(0, 80)}`);
    }
    // reset errors for next page
    Object.keys(consoleErrors).forEach(k => delete consoleErrors[k]);
  }

  // === LOGIN ===
  await page.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle' });

  // Fill username (formcontrolname='username', type='text')
  await page.locator('input[formcontrolname="username"]').fill('admin');
  await page.locator('input[type="password"]').fill('12345678');

  // Click submit button
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from /auth
  try {
    await page.waitForURL(u => !u.includes('/auth/login'), { timeout: 10000 });
  } catch(e) {
    // Check if there's an error message
    const errMsg = await page.locator('.error, .alert, [class*="error"]').first().textContent({ timeout: 1000 }).catch(() => '');
    console.log('LOGIN FAILED - still on login page. Error msg: ' + errMsg);
  }

  const loginUrl = page.url().replace('http://localhost:4200','');
  console.log('LOGIN -> ' + loginUrl);

  if (loginUrl.includes('/auth')) {
    console.log('ERROR: Login did not succeed. Checking page content...');
    const body = await page.locator('body').textContent({ timeout: 2000 }).catch(() => '');
    console.log('Page snippet: ' + body.substring(0, 300));
    await browser.close();
    return;
  }

  // === RUTAS A PROBAR ===
  const routes = [
    // Admin
    ['/admin/dashboard', 'Admin Dashboard'],
    ['/admin/categories', 'Categorias'],
    ['/admin/products', 'Productos'],
    ['/admin/orders', 'Pedidos'],
    ['/admin/customers', 'Clientes'],
    ['/admin/companies', 'Empresas'],
    ['/admin/inventario/dashboard', 'Inventario Dashboard'],
    ['/admin/inventario/almacenes', 'Inventario Almacenes'],
    ['/admin/inventario/ubicaciones', 'Ubicaciones'],
    ['/admin/inventario/kardex', 'Kardex'],
    // Compras
    ['/compras/dashboard', 'Compras Dashboard'],
    ['/compras/proveedores', 'Proveedores'],
    ['/compras/ordenes', 'Ordenes Compra'],
    ['/compras/recepcion', 'Recepcion'],
    // POS
    ['/pos', 'POS'],
    // Logistica
    ['/logistica', 'Logistica Dashboard'],
    ['/logistica/almacenes', 'Log Almacenes'],
    ['/logistica/movimientos', 'Movimientos'],
    ['/logistica/guias', 'Guias Remision'],
    ['/logistica/tracking', 'Tracking'],
    ['/logistica/seguimiento', 'Seguimiento'],
    // Inventario
    ['/inventario/stock', 'Stock'],
    ['/inventario/movimientos', 'Inv Movimientos'],
    ['/inventario/kardex', 'Inv Kardex'],
    // Tesoreria
    ['/tesoreria/cajas', 'Cajas'],
    ['/tesoreria/pagos', 'Pagos'],
    ['/tesoreria/flujo-caja', 'Flujo Caja'],
    // Contabilidad
    ['/contabilidad', 'Contabilidad Dashboard'],
    ['/contabilidad/diario', 'Libro Diario'],
    ['/contabilidad/ventas', 'Reg. Ventas'],
    ['/contabilidad/compras', 'Reg. Compras'],
    ['/contabilidad/igv', 'Declaracion IGV'],
    // RRHH
    ['/rrhh/employees', 'Empleados'],
    ['/rrhh/attendance', 'Asistencia'],
    ['/rrhh/payroll', 'Planillas'],
    ['/rrhh/vacations', 'Vacaciones'],
    ['/rrhh/evaluations', 'Evaluaciones'],
    ['/rrhh/trainings', 'Capacitaciones'],
  ];

  for (const [path, label] of routes) {
    await visit(path, label);
    await page.waitForTimeout(500);
  }

  await browser.close();

  // Reporte final
  const redirected = report.filter(r => r.redirected);
  const errors = report.filter(r => r.errors?.length > 0);
  const broken = report.filter(r => r.error);

  console.log('\n=== RESUMEN ===');
  console.log(`Total rutas: ${report.length}`);
  console.log(`Redirigidas: ${redirected.length}`);
  console.log(`Con errores HTTP/JS: ${errors.length}`);
  console.log(`Rotas (timeout/exception): ${broken.length}`);

  if (redirected.length > 0) {
    console.log('\n=== REDIRIGIDAS ===');
    redirected.forEach(r => console.log(`  ${r.path} -> ${r.finalUrl}`));
  }
  if (errors.length > 0) {
    console.log('\n=== CON ERRORES HTTP/JS ===');
    errors.forEach(r => { console.log(`  ${r.path}:`); r.errors.forEach(e => console.log(`    ${e}`)); });
  }
  if (broken.length > 0) {
    console.log('\n=== ROTAS ===');
    broken.forEach(r => console.log(`  ${r.path}: ${r.error}`));
  }
})();
