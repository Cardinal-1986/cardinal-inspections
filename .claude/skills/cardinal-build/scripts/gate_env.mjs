/* gate_env.mjs — where a browser gate finds Playwright, Chromium, this folder and the app.
 *
 * Gates 1116, 1317, 1400, 1416, 1420, 1430 and 1441 were written inside the cloud container and
 * hard-coded its paths (/home/user/cardinal-inspections, /opt/node22, /opt/pw-browsers/chromium-1194).
 * So they could run on that one machine only: not in CI (the runner checks out under
 * /home/runner/work and installs Playwright with npm) and not on a Windows desk. Five of them had
 * been red for weeks with nobody told, because nothing else ever ran them. They read their
 * environment from here now.
 *
 *   PW_CORE      a playwright / playwright-core folder     (else the container's, else `playwright`)
 *   PW_CHROMIUM  a chrome executable                        (else the container's, else Playwright's own)
 */
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const BOX_PW = '/opt/node22/lib/node_modules/playwright/index.js';
const BOX_EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export const { chromium } = require(process.env.PW_CORE || (existsSync(BOX_PW) ? BOX_PW : 'playwright'));
const EXE = process.env.PW_CHROMIUM || (existsSync(BOX_EXE) ? BOX_EXE : '');
/** spread into chromium.launch(): the executable only when one is named or the container's exists */
export const launchOpts = EXE ? { executablePath: EXE } : {};
/** this folder, forward slashes, trailing slash - safe to concatenate a file name onto */
export const SCRIPTS = HERE.replace(/\\/g, '/') + '/';
/** the shipped app, four folders up */
export const APP = resolve(HERE, '../../../../index.html');
/** a test-only package (typescript, axe-core): normal resolution, then beside PW_CORE, then npm's global root */
export function tool(name) {
  const tries = [name];
  if (process.env.PW_CORE) tries.push(resolve(process.env.PW_CORE, '..', name));
  for (const t of tries) { try { return require(t); } catch (_) {} }
  return require(require('child_process').execSync('npm root -g').toString().trim() + '/' + name);
}
