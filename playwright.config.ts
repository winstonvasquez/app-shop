import { defineConfig, devices } from '@playwright/test';

/** Sesión real del superadmin, generada por el proyecto `setup`. */
const STORAGE_STATE = 'e2e/.auth/superadmin.json';

/** Specs que corren autenticados contra el backend real. */
const ERP_SPECS = /.*\.erp\.spec\.ts/;

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
            // Login real una sola vez; deja la sesión en STORAGE_STATE.
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
        },
        {
            // Suite del ERP: navegación de menús, CRUD y filtros con sesión real.
            name: 'erp',
            testMatch: ERP_SPECS,
            dependencies: ['setup'],
            use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
        },
        {
            // Suite heredada (tokens simulados, storefront y ruteo).
            name: 'chromium',
            testIgnore: [ERP_SPECS, /auth\.setup\.ts/],
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
