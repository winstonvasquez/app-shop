
import { chromium } from 'playwright';
const BASE='http://localhost:4200';
const b=await chromium.launch(); const p=await (await b.newContext()).newPage();
await p.goto(`${BASE}/auth/login`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
const rule=await p.evaluate(()=>{
  let out=[];
  for (const sheet of document.styleSheets){
    let rules; try{rules=sheet.cssRules}catch{continue}
    for (const r of rules){
      if (r.selectorText && r.selectorText.includes('max-w-3xl')) out.push(r.cssText.slice(0,160));
      if (r.cssRules) for (const rr of r.cssRules){ if (rr.selectorText && rr.selectorText.includes('max-w-3xl')) out.push('@layer: '+rr.cssText.slice(0,160)); }
    }
  }
  return out;
});
console.log(JSON.stringify(rule,null,1));
await b.close();
