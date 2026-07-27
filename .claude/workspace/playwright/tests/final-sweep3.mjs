
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const urls=['/admin/rrhh/attendance','/admin/rrhh/evaluations','/admin/rrhh/trainings','/admin/promotions','/admin/contabilidad/registro-compras','/admin/tesoreria/flujo-caja','/admin/compras/cotizaciones','/admin/compras/facturas','/admin/contabilidad/auditoria','/admin/reports/customers','/admin/reports/rrhh','/admin/contabilidad/libro-diario'];
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
let ec=0; const byPage={};
p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text())){ec++;(byPage[p.url()]??=[]).push(m.text().slice(0,80))}});
p.on('pageerror',e=>{ec++;(byPage[p.url()]??=[]).push('PE:'+e.message.slice(0,80))});
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const u of urls){
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
  const i=await p.evaluate(()=>{
    const fb=document.querySelector('.filters-bar');
    const hs=[...(fb?.querySelectorAll('input,select')||[])].map(e=>Math.round(e.getBoundingClientRect().height));
    return {tb:!!document.querySelector('.table-toolbar'),tf:document.querySelectorAll('.table-filter select').length,fbH:hs.slice(0,4)};
  });
  console.log(u.padEnd(38), JSON.stringify(i), p.url().includes(u.split('/').pop())?'':'REDIR:'+p.url().replace(BASE,''));
}
console.log('ERRORS:',ec); if(ec) console.log(JSON.stringify(byPage).slice(0,600));
await b.close();
