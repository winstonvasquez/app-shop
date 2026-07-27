
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,140))}); p.on('pageerror',e=>errs.push('PE:'+e.message.slice(0,140)));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
await p.goto(`${BASE}/admin/segments`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3000);
console.log('URL:', p.url());
console.log(await p.evaluate(()=>({dt:!!document.querySelector('app-data-table'),body:document.body.innerText.slice(0,150)})));
console.log('ERRS:', JSON.stringify(errs.slice(0,5),null,1));
await b.close();
