import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const urls=['/admin/returns','/admin/reports/ventas','/admin/inventario/stock','/admin/compras/catalogo','/admin/segments','/admin/customers','/admin/orders','/admin/compras/proveedores','/admin/rrhh/employees','/admin/companies','/admin/products'];
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
let errCount=0; const errsByPage={};
p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text())){errCount++;(errsByPage[p.url()]??=[]).push(m.text().slice(0,90))}});
p.on('pageerror',e=>{errCount++;(errsByPage[p.url()]??=[]).push('PE:'+e.message.slice(0,90))});
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const u of urls){ await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200); }
console.log('PAGES:',urls.length,'ERRORS:',errCount);
if(errCount) console.log(JSON.stringify(errsByPage,null,1).slice(0,800));
await b.close();
