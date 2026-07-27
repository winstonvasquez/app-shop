import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text()))errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const [name,url] of [['reportes-ventas','/admin/reports/ventas'],['stock','/admin/inventario/stock']]) {
  await p.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3000);
  const info=await p.evaluate(()=>({
    toolbar:!!document.querySelector('.table-toolbar'),
    paginationInside:!!document.querySelector('.data-table-container app-pagination'),
    cardWrapTable:!!document.querySelector('.card .data-table-container'),
    rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length,
    filterOpts:[...document.querySelectorAll('.table-filter select option')].map(o=>o.textContent.trim()).slice(0,5),
  }));
  console.log(name, JSON.stringify(info));
  await p.screenshot({path:`.claude/workspace/screenshots/diag-${name}.png`});
}
console.log('ERRORS:',JSON.stringify(errs.slice(0,5)));
await b.close();
