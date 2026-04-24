const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture network requests
    page.on('request', req => {
        if (req.url().includes('treasury') || req.url().includes('cajas')) {
            const authHdr = req.headers()['authorization'];
            console.log(`REQ: ${req.method()} ${req.url()}`);
            console.log(`  Authorization: ${authHdr ? authHdr.substring(0, 40) + '...' : 'MISSING'}`);
        }
    });
    page.on('response', async res => {
        if (res.url().includes('treasury') || res.url().includes('cajas')) {
            const body = await res.text().catch(() => '');
            console.log(`RES: ${res.status()} ${res.url()}`);
            console.log(`  Body: ${body.substring(0, 100)}`);
        }
    });
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`CONSOLE ERROR: ${msg.text()}`);
        }
    });
    
    await page.goto('http://localhost:4200/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.getByLabel(/usuario|email|username/i).fill('admin');
    await page.getByLabel(/contraseña|password/i).fill('12345678');
    await page.getByRole('button', { name: /ingresar|iniciar|login/i }).click();
    await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 15000 });
    
    console.log('Logged in, navigating to cajas...');
    await page.goto('http://localhost:4200/tesoreria/cajas');
    await page.waitForLoadState('networkidle');
    
    const noData = await page.locator('text=No hay cajas').count();
    console.log(`No data message visible: ${noData > 0}`);
    
    await browser.close();
})();
