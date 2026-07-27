
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const urls=['/admin/logistica/envios','/admin/logistica/guias','/admin/logistica/movimientos','/admin/logistica/devoluciones','/admin/inventario/conteos','/admin/inventario/ubicaciones','/admin/inventario/movimientos','/admin/inventario/transferencias','/admin/inventario/abc'];
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
let ec=0; const byPage={};
p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text())){ec++;(byPage[p.url()]??=[]).push(m.text().slice(0,80))}});
p.on('pageerror',e=>{ec++;(byPage[p.url()]??=[]).push('PE:'+e.message.slice(0,80))});
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000);
for (const u of urls){
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
  const i=await p.evaluate(()=>({t:!!document.querySelector('.table-toolbar'),f:document.querySelectorAll('.table-filter select').length,x:!!document.querySelector('.table-toolbar-extra input'),kpi:!!document.querySelector('.kpi-card')}));
  console.log(u.padEnd(36), JSON.stringify(i), p.url().includes(u)?'':'REDIR->'+p.url());
}
console.log('ERRORS:',ec); if(ec) console.log(JSON.stringify(byPage).slice(0,500));
await b.close();
