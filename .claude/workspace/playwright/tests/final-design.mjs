
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const urls=['/admin/tesoreria/cajas','/admin/tesoreria/flujo-caja','/admin/tesoreria/cuentas','/admin/tesoreria/pagos','/admin/returns','/admin/promotions','/admin/contabilidad/ventas','/admin/contabilidad/libro-diario','/admin/contabilidad/libro-mayor','/admin/contabilidad/registro-compras','/admin/contabilidad/declaracion-igv','/admin/contabilidad/estado-resultados','/admin/reports/customers','/admin/reports/rrhh','/admin/logistica/tracking'];
const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
let ec=0; const byPage={};
p.on('console',m=>{if(m.type()==='error'&&!/SystemParameter/.test(m.text())){ec++;(byPage[p.url()]??=[]).push(m.text().slice(0,80))}});
p.on('pageerror',e=>{ec++;(byPage[p.url()]??=[]).push('PE:'+e.message.slice(0,80))});
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
await p.fill('input[formControlName="username"]','admin'); await p.fill('input[formControlName="password"]','12345678');
await p.click('#btn-login-submit'); await p.waitForURL('**/admin/**',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(1500);
for (const u of urls){
  await p.goto(`${BASE}${u}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1800);
  const i=await p.evaluate(()=>({
    kpiCards: document.querySelectorAll('.card-metric, .kpi-card').length,
    tableInCard: !!document.querySelector('.card .data-table-container, .card-body .data-table-container'),
    filtersInCard: !!document.querySelector('.card .filters-bar, .card-body .filters-bar'),
    fbOneLine: (()=>{ const fb=document.querySelector('.filters-bar'); if(!fb) return null;
      const els=[...fb.querySelectorAll('select,input,app-button button')]; if(els.length<2) return true;
      const tops=els.map(e=>Math.round(e.getBoundingClientRect().top)); return Math.max(...tops)-Math.min(...tops)<=6; })(),
  }));
  const bad = i.kpiCards>0||i.tableInCard||i.filtersInCard||i.fbOneLine===false;
  console.log((bad?'✗ ':'✓ ')+u.padEnd(42), JSON.stringify(i));
}
console.log('CONSOLE ERRORS:',ec); if(ec) console.log(JSON.stringify(byPage).slice(0,500));
await b.close();
