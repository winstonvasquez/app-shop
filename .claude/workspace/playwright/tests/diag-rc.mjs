
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))}); p.on('pageerror',e=>errs.push('PE:'+e.message.slice(0,200)));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
await p.goto(`${BASE}/admin/contabilidad/registro-compras`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>({dt:!!document.querySelector('app-data-table'),tb:!!document.querySelector('.table-toolbar'),body:document.body.innerText.slice(200,380)})));
console.log('ERRS:',JSON.stringify(errs.filter(e=>!/SystemParameter|404/.test(e)).slice(0,3),null,1));
await b.close();
