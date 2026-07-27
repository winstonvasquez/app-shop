
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text()))errs.push(m.text().slice(0,100))}); p.on('pageerror',e=>errs.push('PE:'+e.message.slice(0,100)));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
for (const u of ['/admin/contabilidad/libro-diario','/admin/compras/cotizaciones']) {
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
  const i=await p.evaluate(()=>({tb:!!document.querySelector('.table-toolbar'),pag:!!document.querySelector('.data-table-container app-pagination'),rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length,oldTable:!!document.querySelector('.page-container > table, .card table')}));
  console.log(u, JSON.stringify(i), p.url().includes(u.split('/').pop())?'':'REDIR:'+p.url().replace(BASE,''));
}
console.log('ERRORS:', JSON.stringify(errs.slice(0,4)));
await b.close();
