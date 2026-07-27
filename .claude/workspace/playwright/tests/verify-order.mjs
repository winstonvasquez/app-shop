
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
for (const u of ['/admin/rrhh/employees','/admin/compras/proveedores']) {
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
  const d=await p.evaluate(()=>{
    const tb=document.querySelector('.table-toolbar'); if(!tb) return null;
    const inp=tb.querySelector('.search-box input');
    const sel=tb.querySelector('.table-filter select');
    const btn=[...tb.querySelectorAll('app-button button')].find(b=>/buscar/i.test(b.innerText));
    const x=e=>e?Math.round(e.getBoundingClientRect().left):null;
    return { input:x(inp), select:x(sel), buscar:x(btn), ordenOK: x(inp)<x(sel) && x(sel)<x(btn) };
  });
  console.log(u.padEnd(30), JSON.stringify(d));
}
await b.close();
