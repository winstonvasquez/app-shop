import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text()))errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
await p.goto(`${BASE}/admin/returns`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3000);
const info=await p.evaluate(()=>({
  toolbar:!!document.querySelector('.table-toolbar'),
  paginationInside:!!document.querySelector('.data-table-container app-pagination'),
  cardWrap:!!document.querySelector('.card .data-table-container'),
  rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length,
  filterPresent:!!document.querySelector('.table-filter select'),
  kpis:[...document.querySelectorAll('.card-metric-value')].map(e=>e.innerText.trim()),
  firstRow:(document.querySelector('.data-table tbody tr')||{}).innerText?.slice(0,80)
}));
console.log(JSON.stringify(info,null,1)); console.log('ERRORS:',JSON.stringify(errs.slice(0,4)));
await p.screenshot({path:'.claude/workspace/screenshots/diag-returns.png'});
await b.close();
