const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Intercept treasury cajas response
    await page.route('**/treasury/api/tesoreria/cajas**', async route => {
        const response = await route.fetch();
        const body = await response.text();
        console.log(`INTERCEPTED STATUS: ${response.status()}`);
        console.log(`INTERCEPTED BODY LENGTH: ${body.length}`);
        console.log(`INTERCEPTED BODY PREVIEW: ${body.substring(0, 200)}`);
        await route.fulfill({ response });
    });
    
    page.on('console', msg => {
        if (['error', 'warn', 'log'].includes(msg.type())) {
            console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });
    
    await page.goto('http://localhost:4200/auth/login');
    await page.waitForLoadState('networkidle');
    
    await page.getByLabel(/usuario|email|username/i).fill('admin');
    await page.getByLabel(/contraseña|password/i).fill('12345678');
    await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();
    await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15000 });
    
    console.log('Logged in, navigating to cajas...');
    await page.goto('http://localhost:4200/tesoreria/cajas');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait
    
    const noData = await page.locator('text=No hay cajas').count();
    const gridDivs = await page.locator('[class*="grid"] > div:not(:empty)').count();
    console.log(`No data message: ${noData > 0}`);
    console.log(`Grid child divs: ${gridDivs}`);
    
    await browser.close();
})();
