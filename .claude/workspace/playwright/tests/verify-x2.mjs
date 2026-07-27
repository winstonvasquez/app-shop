
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
// estado-resultados screenshot
await p.goto(`${BASE}/admin/contabilidad/estado-resultados`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
await p.screenshot({path:'.claude/workspace/screenshots/er-fixed.png'});
// X position inside input (orders)
await p.goto(`${BASE}/admin/orders`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
await p.fill('.table-search input','test'); await p.waitForTimeout(400);
const d=await p.evaluate(()=>{
  const inp=document.querySelector('.table-search input'); const x=document.querySelector('.search-clear');
  if(!inp||!x) return {found:false};
  const ri=inp.getBoundingClientRect(), rx=x.getBoundingClientRect();
  return {found:true, inside: rx.left>ri.left && rx.right<ri.right && rx.top>=ri.top-2 && rx.bottom<=ri.bottom+2,
          xw:Math.round(rx.width), bg:getComputedStyle(x).backgroundColor};
});
console.log('X:', JSON.stringify(d));
const clip=await p.locator('.table-search').boundingBox();
await p.screenshot({path:'.claude/workspace/screenshots/x-inside.png', clip});
await b.close();
