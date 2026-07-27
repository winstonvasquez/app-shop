import { chromium } from 'playwright';
const BASE = 'http://localhost:4200';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs = [];
p.on('console', m => { if (m.type()==='error' && !/SystemParameter/.test(m.text())) errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const path of ['departments','positions','contracts','vacations']) {
  await p.goto(`${BASE}/admin/rrhh/${path}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2800);
  const info = await p.evaluate(() => ({
    toolbar: !!document.querySelector('.table-toolbar'),
    paginationInside: !!document.querySelector('.data-table-container app-pagination'),
    rows: document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length,
    rowsPerPage: (document.querySelector('.pg-select, [class*=pagesize] select, select')||{}).value
  }));
  console.log(path, JSON.stringify(info), 'errs:', errs.length);
}
console.log('ERRORS:', JSON.stringify(errs.slice(0,6)));
await b.close();
