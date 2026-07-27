import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const url of ['/admin/reportes/ventas','/admin/inventario/stock']) {
  await p.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(3000);
  const t=await p.evaluate(()=>({title:(document.querySelector('.page-title,h1')||{}).innerText, hasDT:!!document.querySelector('app-data-table'), body:document.body.innerText.slice(0,140)}));
  console.log(url,'->',p.url()); console.log(JSON.stringify(t));
}
await b.close();
