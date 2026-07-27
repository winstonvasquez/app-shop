
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
await p.goto(`${BASE}/admin/contabilidad/estado-resultados`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
console.log('URL:', p.url());
const d=await p.evaluate(()=>{
  const wrap=document.querySelector('.max-w-3xl');
  const card=wrap?.querySelector('.card');
  const cs=e=>{const c=getComputedStyle(e);return{w:Math.round(e.getBoundingClientRect().width),display:c.display,maxWidth:c.maxWidth,flexDir:c.flexDirection,alignItems:c.alignItems}};
  return { wrap: wrap?cs(wrap):null, card: card?cs(card):null,
    parent: wrap?cs(wrap.parentElement):null,
    parentClass: wrap?.parentElement?.className?.slice(0,80) };
});
console.log(JSON.stringify(d,null,1));
await p.screenshot({path:'.claude/workspace/screenshots/diag-er.png'});
await b.close();
