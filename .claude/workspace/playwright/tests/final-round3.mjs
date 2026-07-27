
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
let ec=0; const byPage={};
p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text())){ec++;(byPage[p.url()]??=[]).push(m.text().slice(0,90))}});
p.on('pageerror',e=>{ec++;(byPage[p.url()]??=[]).push('PE:'+e.message.slice(0,90))});
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
// 3 vistas: filtros al toolbar
for (const [n,u] of [['asientos','/admin/contabilidad/asientos'],['plan-cuentas','/admin/contabilidad/plan-cuentas'],['registro-compras','/admin/contabilidad/registro-compras']]) {
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2200);
  const d=await p.evaluate(()=>{
    const tb=document.querySelector('.table-toolbar');
    const fb=document.querySelector('.filters-bar');
    const inp=tb?.querySelector('.search-box input');
    const sels=tb?.querySelectorAll('.table-filter select').length??0;
    const btn=[...(tb?.querySelectorAll('app-button button')||[])].find(b=>/buscar/i.test(b.innerText));
    const x=e=>e?Math.round(e.getBoundingClientRect().left):null;
    return {toolbar:!!tb, filtrosEnToolbar:sels, filtersBarExterna:!!fb, buscarAlFinal: inp&&btn ? (sels?x(btn)>x(tb.querySelectorAll('.table-filter select')[sels-1]):x(btn)>x(inp)) : null};
  });
  console.log(n.padEnd(18), JSON.stringify(d));
}
// chips en header
for (const [n,u] of [['returns','/admin/returns'],['cajas','/admin/tesoreria/cajas'],['flujo-caja','/admin/tesoreria/flujo-caja'],['pagos','/admin/tesoreria/pagos'],['promotions','/admin/promotions'],['libro-diario','/admin/contabilidad/libro-diario'],['libro-mayor','/admin/contabilidad/libro-mayor'],['registro-ventas','/admin/contabilidad/ventas'],['cuentas','/admin/tesoreria/cuentas']]) {
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
  const d=await p.evaluate(()=>{
    const chips=document.querySelectorAll('.header-kpis .header-kpi').length;
    const inHeader=!!document.querySelector('.page-header .header-kpis, app-page-header .header-kpis');
    const ph=document.querySelector('.page-header, app-page-header .ph-root');
    const h=ph?Math.round(ph.getBoundingClientRect().height):null;
    const oldLine=!!document.querySelector('.page-container > .flex.flex-wrap.gap-x-6, .page-container div.text-subtle.mb-sm');
    return {chips, inHeader, headerH:h, lineaVieja:oldLine};
  });
  console.log(n.padEnd(18), JSON.stringify(d));
}
console.log('ERRORS:',ec); if(ec) console.log(JSON.stringify(byPage).slice(0,600));
await p.goto(`${BASE}/admin/returns`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2000);
await p.screenshot({path:'.claude/workspace/screenshots/chips-header.png', clip:{x:260,y:50,width:1340,height:220}});
await b.close();
