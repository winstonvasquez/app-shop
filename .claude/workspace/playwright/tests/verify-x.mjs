
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text()))errs.push(m.text().slice(0,90))}); p.on('pageerror',e=>errs.push('PE:'+e.message.slice(0,90)));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
// segments (convertida)
await p.goto(`${BASE}/admin/segments`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
let i=await p.evaluate(()=>({tb:!!document.querySelector('.table-toolbar'),pag:!!document.querySelector('.data-table-container app-pagination'),rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length}));
console.log('segments', JSON.stringify(i));
// X clear en el toolbar: escribir texto y comprobar botón
await p.fill('.table-search input','abc'); await p.waitForTimeout(400);
let x=await p.evaluate(()=>!!document.querySelector('.search-clear'));
console.log('X visible tras escribir:', x);
if(x){ await p.click('.search-clear'); await p.waitForTimeout(400);
  console.log('input tras X:', await p.evaluate(()=>document.querySelector('.table-search input').value)); }
// customer-list (convertida con selección)
await p.goto(`${BASE}/admin/customers`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
i=await p.evaluate(()=>({tb:!!document.querySelector('.table-toolbar'),sel:!!document.querySelector('.data-table thead .select-column input'),rows:document.querySelectorAll('.data-table tbody tr:not(.skeleton-row)').length}));
console.log('customers', JSON.stringify(i));
await p.screenshot({path:'.claude/workspace/screenshots/verify-segments-customers.png'});
console.log('ERRORS:', JSON.stringify(errs.slice(0,4)));
await b.close();
