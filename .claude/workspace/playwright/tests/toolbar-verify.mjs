import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const SHOT = '.claude/workspace/screenshots';

const pages = [
  { name: 'employees', url: `${BASE}/admin/rrhh/employees` },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await ctx.newPage();

// ── Login ──────────────────────────────────────────────
await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.fill('input[formControlName="username"]', 'admin');
await page.fill('input[formControlName="password"]', '12345678');
await page.waitForTimeout(300);
await page.click('#btn-login-submit');
await page.waitForURL('**/admin/**', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
console.log('After login URL:', page.url());

for (const p of pages) {
  await page.goto(p.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const toolbar = document.querySelector('.table-toolbar');
    if (!toolbar) return { error: 'no .table-toolbar found' };
    const input = toolbar.querySelector('.table-search input');
    const searchBtn = toolbar.querySelector('.table-search app-button button');
    const exportWrap = toolbar.querySelector('.table-export-buttons');
    const exportBtns = [...toolbar.querySelectorAll('.table-export-buttons app-button button')];
    const filterSel = toolbar.querySelector('.table-filter select');
    const r = (el) => el ? el.getBoundingClientRect() : null;
    const round = (v) => v == null ? null : Math.round(v);
    const ri = r(input), rb = r(searchBtn), re = r(exportWrap);
    return {
      inputH: round(ri?.height), inputY: round(ri?.top),
      searchBtnLabel: searchBtn?.innerText?.trim(), searchBtnH: round(rb?.height), searchBtnY: round(rb?.top),
      exportLabels: exportBtns.map(b => b.innerText.trim()),
      exportH: round(r(exportBtns[0])?.height), exportY: round(r(exportBtns[0])?.top),
      exportLeft: round(re?.left), exportRight: round(re?.right),
      toolbarLeft: round(r(toolbar)?.left), toolbarRight: round(r(toolbar)?.right),
      filterPresent: !!filterSel, filterH: round(r(filterSel)?.height),
      actionBtn: (() => {
        const b = document.querySelector('.data-table .actions-column .btn-icon, .data-table .action-buttons button');
        if (!b) return null;
        const cs = getComputedStyle(b); const rb = r(b);
        return { h: round(rb.height), w: round(rb.width), border: cs.borderTopWidth, borderColor: cs.borderTopColor };
      })(),
      paginationInside: !!document.querySelector('.data-table-container app-pagination'),
      externalPagination: !!document.querySelector('.orders-page > app-pagination, .proveedores-page > app-pagination'),
      sameRow: ri && rb && re ? Math.abs(ri.top - rb.top) <= 3 && Math.abs(ri.top - r(exportBtns[0]).top) <= 3 : null,
      exportRightAligned: re && r(toolbar) ? (r(toolbar).right - re.right) < 40 : null,
    };
  });
  console.log(`\n=== ${p.name} (${p.url}) ===`);
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: `${SHOT}/toolbar-${p.name}.png`, fullPage: false });
}

await browser.close();
