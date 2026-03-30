import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env['CI'],
    retries: process.env['CI'] ? 2 : 1,
    workers: 1,
    timeout: 60_000,
    reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
    use: {
        baseURL: 'http://localhost:4200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Requiere que `npm start` esté corriendo antes de ejecutar los tests
    webServer: {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env['CI'],
        timeout: 180_000,
    },
});
