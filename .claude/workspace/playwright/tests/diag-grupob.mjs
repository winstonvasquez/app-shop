import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text()))errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message));
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const [name,url] of [['users','/admin/users'],['segments','/admin/segments'],['customers','/admin/customers'],['catalogo','/admin/compras/catalogo']]) {
  await p.goto(`${BASE}${url}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2800);
  const info=await p.evaluate(()=>{
    const fb=document.querySelector('.filters-bar');
    const input=fb?.querySelector('.search-box input');
    const btn=[...(fb?.querySelectorAll('app-button button')||[])].find(b=>/buscar/i.test(b.innerText));
    const r=e=>e?e.getBoundingClientRect():null; const ri=r(input), rb=r(btn);
    return {
      buscarBtn:!!btn, inputH:ri?Math.round(ri.height):null, btnH:rb?Math.round(rb.height):null,
      sameRow:ri&&rb?Math.abs(ri.top-rb.top)<=3:null,
      rows:document.querySelectorAll('table tbody tr, app-user-list tbody tr, .data-table tbody tr').length,
    };
  });
  console.log(name, '->', p.url().replace(BASE,''), JSON.stringify(info));
}
console.log('ERRORS:',JSON.stringify(errs.slice(0,5)));
await b.close();
