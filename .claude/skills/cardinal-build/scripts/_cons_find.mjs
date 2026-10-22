// find the CSS rule that wins border-radius / padding / font-weight / letter-spacing for every card, button and heading
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync, writeFileSync } from 'fs';
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const chromium = require('playwright').chromium;
const { launchChromium } = require(S + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2], 'utf8');
const SETUP = readFileSync(S + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(S + 'e2e_mock_supa.js', 'utf8');
const SCREENS = [['Home', `try{CardinalHeader.goHome()}catch(e){}`], ['Jobs list', `openLeadsView()`], ['Client page', `openProject(cacheProjects[0].id)`],
  ['Schedule', `openScheduleBoard()`], ['Invoices & Payments', `openAR()`]];
const b = await launchChromium(chromium);
const hits = [];
for (const theme of ['dark', 'light']) for (const [sn, go] of SCREENS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (theme === 'light') await p.addInitScript('window.__sentinelTheme = "rb-light";');
  await p.addInitScript(SETUP);
  const cdp = await ctx.newCDPSession(p);
  const sheets = {};
  cdp.on('CSS.styleSheetAdded', e => { sheets[e.header.styleSheetId] = e.header; });
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
  await p.evaluate(go => { try { (0, eval)(go); } catch (e) {} }, go);
  await p.waitForTimeout(1800);
  // tag targets in page
  const n = await p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' && r.top < 6000; };
    let k = 0;
    for (const e of [...document.querySelectorAll('body *')].filter(vis)) {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      const painted = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.backgroundImage !== 'none';
      const rad = parseFloat(c.borderTopLeftRadius), pad = parseFloat(c.paddingTop), padL = parseFloat(c.paddingLeft);
      const kinds = [];
      if (painted && r.width >= 250 && r.height >= 48 && e.tagName !== 'BUTTON' && rad >= 8 && rad <= 20) kinds.push(pad >= 8 && pad <= 20 && padL >= 8 && padL <= 20 ? 'card' : 'cardr');
      if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && r.width > 30 && rad >= 4 && rad <= 20 && rad !== 10) kinds.push('btn');
      const own = [...e.childNodes].some(nd => nd.nodeType === 3 && nd.textContent.trim());
      if (own && parseFloat(c.fontSize) >= 15 && e.tagName !== 'BUTTON' && !e.closest('button')) {
        const w = parseFloat(c.fontWeight);
        if (w >= 600 && w !== 800) kinds.push('headw');
        if (w >= 600 && c.textTransform === 'none' && c.letterSpacing !== 'normal' && c.letterSpacing !== '0px') kinds.push('headls');
      }
      if (kinds.length) { e.setAttribute('data-cons', String(k++)); e.setAttribute('data-cons-k', kinds.join(',')); }
    }
    return k;
  });
  const doc = await cdp.send('DOM.getDocument', { depth: -1 });
  const q = await cdp.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: '[data-cons]' });
  for (const nodeId of q.nodeIds) {
    const attrs = (await cdp.send('DOM.getAttributes', { nodeId })).attributes; const A = {}; for (let i = 0; i < attrs.length; i += 2) A[attrs[i]] = attrs[i + 1];
    const kinds = A['data-cons-k'].split(',');
    const want = []; if (kinds.includes('card')) want.push('border-top-left-radius', 'padding-top', 'padding-left'); if (kinds.includes('cardr') || kinds.includes('btn')) want.push('border-top-left-radius');
    if (kinds.includes('headw')) want.push('font-weight'); if (kinds.includes('headls')) want.push('letter-spacing');
    const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
    for (const prop of [...new Set(want)]) {
      const long = prop, shorts = { 'border-top-left-radius': ['border-radius'], 'padding-top': ['padding'], 'padding-left': ['padding'], 'font-weight': ['font'], 'letter-spacing': [] }[prop];
      const names = [long].concat(shorts);
      let win = null;
      const consider = (src, style, imp0) => { for (const pr of style.cssProperties || []) if (names.includes(pr.name) && pr.text && !pr.disabled && pr.parsedOk !== false) {
          const imp = /!important/.test(pr.value || '') || pr.important;
          if (!win || imp || !win.imp) win = { src, prop: pr.name, value: pr.value, imp: !!imp, range: pr.range, text: pr.text }; } };
      for (const mr of m.matchedCSSRules || []) { if (mr.rule.origin !== 'regular') continue; const st = mr.rule.style; const before = win; consider({ type: 'rule', sheet: mr.rule.styleSheetId, sel: mr.rule.selectorList.text }, st); if (win !== before) win.src.styleRange = st.range; }
      if (m.inlineStyle) consider({ type: 'inline' }, m.inlineStyle);
      if (!win) continue;
      let owner = null;
      if (win.src.type === 'rule') { const h = sheets[win.src.sheet]; if (h && h.ownerNode) { try { const d = await cdp.send('DOM.describeNode', { backendNodeId: h.ownerNode }); const at = d.node.attributes || []; for (let i = 0; i < at.length; i += 2) if (at[i] === 'id') owner = at[i + 1]; } catch (e) {} }
        win.src.inline_sheet = h ? h.isInline : null; win.src.sl = h ? h.startLine : null; win.src.sc = h ? h.startColumn : null; win.src.owner = owner; win.src.sheetLen = h ? h.length : null; }
      const tag = (await cdp.send('DOM.describeNode', { nodeId })).node;
      hits.push({ theme, screen: sn, kind: kinds.join(','), el: tag.localName + (A.class ? '.' + A.class.split(/\s+/).join('.') : '') + (A.id ? '#' + A.id : ''), want: prop, ...win });
    }
  }
  // sheet texts for the sheets referenced
  await ctx.close();
}
await b.close();
writeFileSync(process.argv[3], JSON.stringify(hits, null, 1));
console.log('hits', hits.length);
