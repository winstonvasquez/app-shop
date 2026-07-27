
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,300))}); p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message.slice(0,300)));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1200);
errs.length=0;
await p.goto(`${BASE}/admin/contabilidad/compras`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
console.log('FINAL URL:', p.url());
console.log(await p.evaluate(()=>({tb:!!document.querySelector('.table-toolbar'),filt:document.querySelectorAll('.table-filter select').length,chips:document.querySelectorAll('.header-kpi').length,rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length})));
console.log(JSON.stringify(errs.filter(e=>!/SystemParameter|stream/.test(e)).slice(0,4),null,1));
await b.close();
