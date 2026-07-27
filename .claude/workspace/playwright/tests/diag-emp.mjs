import { chromium } from 'playwright';
const BASE = 'http://localhost:4200';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
await p.goto(`${BASE}/admin/rrhh/employees`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3500);
const info = await p.evaluate(() => ({
  hasToolbar: !!document.querySelector('.table-toolbar'),
  hasDataTable: !!document.querySelector('app-data-table'),
  rows: document.querySelectorAll('.data-table tbody tr').length,
  bodyText: document.body.innerText.slice(0,200)
}));
console.log('URL:', p.url());
console.log('INFO:', JSON.stringify(info,null,2));
console.log('ERRORS:', JSON.stringify(errs.slice(0,8),null,2));
await p.screenshot({path:'.claude/workspace/screenshots/diag-emp.png'});
await b.close();
