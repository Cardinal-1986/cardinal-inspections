/* Crews page — Theo's pick: option 1, with the left side turned into a
 * trade-sectioned nav, in BOTH modes, dark using 545's raised obsidian.
 *
 *   "I like 1 but make the left side a nav bar and have sections such as,
 *    Roofing Crews, Siding Crews, Window Installers, Gutter Crews, and lastly
 *    General Repairs... Id like dark mode to have raised obsidian"
 *
 * Nothing here is invented that the app already has:
 *   · the sectioned nav is #cr-lnav's own shape — .lnav-sec banded headers with
 *     counts, .lnav-item rows, 536's recessed well, both themes
 *   · dark cards are 545's .actbox obsidian, verbatim gradient + shadow
 *   · status chips are the stage palette 544 just put into retail dark
 * Contrast computed for every text colour before it went in.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';

const SECTIONS = [
  ['Roofing Crews', [['Ramirez Roofing', 'clear'], ['Ortiz & Sons', 'clear'], ['Vega Roofing', 'exp']]],
  ['Siding Crews', [['Delgado Exteriors', 'exp'], ['Brennan Siding', 'clear']]],
  ['Window Installers', [['Halstead Windows', 'clear']]],
  ['Gutter Crews', [['Novak Gutter Co', 'lapsed'], ['Ridgeline Gutter', 'clear']]],
  ['General Repairs', [['Marsh Handyman', 'clear']]],
];
const TABS = ['Profile', 'Compliance', 'Labor Rates', 'Work Orders', 'Payments', 'Notes'];
const RATES = [['Siding, vinyl D4', 'sq', 285, 224], ['Trim wrap, aluminum', 'lf', 9, 7],
  ['Soffit + fascia', 'lf', 14, 11], ['Tear-off, 1 layer', 'sq', 95, 78],
  ['Haul-off + sweep', 'ea', 150, 120]];

const OBSIDIAN = `background:radial-gradient(120% 90% at 22% -10%,#2c2d36 0%,#15161c 45%,#08080b 100%);
  border:1px solid #24242c;
  box-shadow:0 10px 24px rgba(0,0,0,.62), 0 2px 0 rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.10) inset;`;

const CSS = (light) => `
*{box-sizing:border-box} body{margin:0;padding:18px;font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;
  background:${light ? '#f2f3f5' : '#0d0d10'};color:${light ? '#2f3338' : '#c2cbd8'}}
.wrap{display:grid;grid-template-columns:236px 1fr;gap:14px;align-items:start}
h1{font:800 16px system-ui;margin:0 0 2px;color:${light ? '#161616' : '#fff'}}
.sub{font-size:12px;margin:0 0 14px;color:${light ? '#5f666e' : '#9aa0a8'}}
.mut{color:${light ? '#5f666e' : '#9aa0a8'}}

/* ── the trade nav — #cr-lnav's own shape, 536's well in both modes ── */
.nav{border-radius:10px;padding:7px 0;overflow:hidden;
  ${light ? `background:#f2f3f5;border:1px solid #dcdee2;
      box-shadow:inset 3px 0 6px -3px rgba(30,45,65,.22), inset -1px 0 0 #fff;`
          : `background:#0A0E16;border:1px solid #223047;
      box-shadow:inset 3px 0 7px -3px rgba(0,0,0,.85), inset -1px 0 0 rgba(255,255,255,.055);`}}
.sec{display:flex;justify-content:space-between;align-items:center;
  font:800 10px system-ui;letter-spacing:.07em;text-transform:uppercase;
  padding:8px 13px 7px;margin-top:5px;
  ${light ? `background:linear-gradient(180deg,#e9ebee,#f2f3f5);color:#5a6068;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 #dcdee2;`
          : `background:linear-gradient(180deg,#141C29,#0F1521);color:#8d97a6;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.055), inset 0 -1px 0 #060910;`}}
.sec .cnt{font-weight:700;opacity:.75}
.item{display:flex;justify-content:space-between;align-items:center;gap:8px;
  padding:8px 13px;font-size:12.5px;border-left:3px solid transparent;
  color:${light ? '#3f3f46' : '#c2cbd8'}}
.item.on{font-weight:700;
  ${light ? `background:#fff;color:#161616;box-shadow:inset 3px 0 0 #c8202e, 0 1px 2px rgba(30,45,65,.10);`
          : `background:linear-gradient(180deg,#1A2434,#141C29);color:#fff;
      box-shadow:inset 3px 0 0 #c8202e, 0 1px 2px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07);`}}
.dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
.dot.clear{background:#4caf71} .dot.exp{background:#e6912d} .dot.lapsed{background:#c8202e}

/* ── the panel — obsidian in dark, raised white in light ── */
.card{border-radius:10px;padding:14px;
  ${light ? `background:#fff;border:1px solid #dcdee2;box-shadow:0 2px 6px rgba(30,45,65,.10);`
          : OBSIDIAN}}
.pill{display:inline-block;font:800 9.5px system-ui;letter-spacing:.06em;text-transform:uppercase;
  padding:3px 8px;border-radius:9px;white-space:nowrap}
${light ? `.clear{background:#e9f5ec;color:#1d6b34}.exp{background:#fdf3e2;color:#8a5200}.lapsed{background:#fff0f0;color:#9c1822}`
        : `.clear{background:rgba(76,175,113,.18);color:#8fdfa8;border:1px solid rgba(76,175,113,.35)}
.exp{background:rgba(230,145,45,.18);color:#f5b880;border:1px solid rgba(230,145,45,.35)}
.lapsed{background:rgba(200,32,46,.2);color:#f4a7ae;border:1px solid rgba(200,32,46,.35)}`}
.tabs{display:flex;gap:2px;flex-wrap:wrap;margin-top:12px}
.tab{font:700 11px system-ui;padding:7px 11px;border-radius:6px 6px 0 0;white-space:nowrap;
  ${light ? 'background:#e9ebee;color:#575d64' : 'background:#14151a;color:#9aa0a8'}}
.tab.on{${light ? 'background:#fff;color:#161616' : 'background:#242430;color:#fff'};box-shadow:inset 0 2px 0 #c8202e}
table{border-collapse:collapse;width:100%;font-size:12px} td,th{padding:7px 9px;text-align:left}
th{font:700 10px system-ui;letter-spacing:.05em;text-transform:uppercase;
  color:${light ? '#5f666e' : '#9aa0a8'};border-bottom:1px solid ${light ? '#dcdee2' : '#2b2b33'}}
td{border-bottom:1px solid ${light ? '#eceef1' : '#232329'}}
.doc{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;
  border-radius:7px;margin-bottom:6px;font-size:12px;
  ${light ? 'background:#f7f8f9;border:1px solid #e4e6ea' : 'background:rgba(255,255,255,.035);border:1px solid #26262e'}}
`;

const nav = () => `<div class="nav">${SECTIONS.map(([name, crews]) => `
  <div class="sec"><span>${name}</span><span class="cnt">${crews.length}</span></div>
  ${crews.map(([n, st]) => `<div class="item${n === 'Delgado Exteriors' ? ' on' : ''}">
    <span>${n}</span><span class="dot ${st}"></span></div>`).join('')}`).join('')}</div>`;

const body = () => `
<div class="card" style="border-radius:10px 10px 0 0;padding-bottom:0">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><b style="font-size:15px">Delgado Exteriors Inc</b>
      <div class="mut" style="margin-top:2px">Siding · Trim &nbsp;·&nbsp; Marco Delgado &nbsp;·&nbsp; 937 555 0192</div></div>
    <span class="pill exp">▲ COI expires in 21 days</span></div>
  <div class="tabs">${TABS.map((t, i) => `<div class="tab${i === 1 ? ' on' : ''}">${t}</div>`).join('')}</div>
</div>
<div class="card" style="border-radius:0 0 10px 10px;border-top:0">
  <div class="doc"><span><b>W-9</b> &nbsp;<span class="mut">filed 1/09/26 · Delgado Exteriors Inc</span></span><span class="pill clear">● On file</span></div>
  <div class="doc"><span><b>General Liability</b> &nbsp;<span class="mut">Grange · $1M / $2M · expires 8/22/26</span></span><span class="pill exp">▲ 21 days</span></div>
  <div class="doc"><span><b>Workers' Comp</b> &nbsp;<span class="mut">nothing on file</span></span><span class="pill lapsed">✕ Missing</span></div>
  <div class="mut" style="font-size:11.5px;margin-top:10px">Drop a PDF here to file it · expiry is read off the certificate you enter</div>
  <div style="height:1px;background:${'rgba(128,128,128,.22)'};margin:14px 0"></div>
  <div style="font:700 10px system-ui;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px" class="mut">Their labor rates — catalog items plus their own</div>
  <table><tr><th>Line item</th><th>Unit</th><th>Ours</th><th>Theirs</th></tr>
  ${RATES.map(r => `<tr><td>${r[0]}</td><td class="mut">${r[1]}</td><td class="mut">$${r[2]}</td><td><b>$${r[3]}</b></td></tr>`).join('')}
  <tr><td>Wrap bay window <span class="mut" style="font-size:10px">(custom)</span></td><td class="mut">ea</td><td class="mut">—</td><td><b>$85</b></td></tr>
  </table>
</div>`;

(async () => {
  const b = await chromium.launch();
  for (const light of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1020, height: 760 }, deviceScaleFactor: 2 });
    await p.setContent(`<html><head><style>${CSS(light)}</style></head><body>
      <h1>Crews</h1><p class="sub">Grouped by trade. ${light ? 'Light mode.' : 'Dark mode — raised obsidian.'}</p>
      <div class="wrap"><div>${nav()}</div><div>${body()}</div></div></body></html>`, { waitUntil: 'load' });
    await p.screenshot({ path: `${SC}/crew_final_${light ? 'light' : 'dark'}.png`, fullPage: true });
    console.log('rendered crew_final_' + (light ? 'light' : 'dark') + '.png');
    await p.close();
  }
  await b.close();
})();
