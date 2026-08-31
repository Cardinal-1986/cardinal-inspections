/* chromium_launch.cjs — one place that knows where Chromium is.
 *
 * WHY. Three of the four Chromium gates hard-coded a browser path, and they
 * hard-coded TWO DIFFERENT ONES:
 *   gate_983          /opt/pw-browsers/chromium-1194/chrome-linux/chrome
 *   harness_occhead   /opt/pw-browsers/chromium
 *   audit_contrast    /opt/pw-browsers/chromium
 * Both are paths inside the sandbox they were written in. On a CI runner
 * neither exists, so every one of them would die at launch — the same class of
 * defect as the absolute .sql paths that made harness_tray unrunnable, and
 * invisible for the same reason: nothing but that sandbox ever ran them.
 *
 * ⚠ AND A LAUNCH FAILURE IS THE WORST SHAPE OF FAILURE HERE. It happens before
 * the first assertion, so it reads as "the gate is broken" rather than "the gate
 * proved nothing" — BUG_CLASSES 37 again.
 *
 * Resolution order: $PW_CHROMIUM (explicit override) -> the known sandbox paths
 * -> undefined, which lets Playwright find the browser it installed itself.
 * That last case is CI, and it is deliberately the fallback rather than a
 * special case: the gate should not care which machine it is on.
 */
const fs = require('fs');

const CANDIDATES = [
  process.env.PW_CHROMIUM,
  '/opt/pw-browsers/chromium',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);

/** The executable to use, or undefined to let Playwright resolve its own. */
function chromiumPath() {
  return CANDIDATES.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
}

/**
 * Launch Chromium wherever it lives.
 * `--no-sandbox` is always passed: CI runners need it, and it is harmless here.
 */
async function launchChromium(chromium, opts = {}) {
  const exe = chromiumPath();
  const args = ['--no-sandbox', ...(opts.args || [])];
  try {
    return await chromium.launch({ ...opts, args, ...(exe ? { executablePath: exe } : {}) });
  } catch (e) {
    throw new Error(
      'chromium_launch: could not start Chromium' +
      (exe ? ` at ${exe}` : ' (no sandbox path found; Playwright had no browser installed either)') +
      ` — ${e.message}. Install one with "npx playwright install chromium" or set $PW_CHROMIUM.`);
  }
}

module.exports = { chromiumPath, launchChromium, CANDIDATES };
