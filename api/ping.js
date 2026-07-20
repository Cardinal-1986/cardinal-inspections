// Diagnostic ping (ESM, matching api/package.json "type": "module")
export default function handler(req, res) {
  res.status(200).json({ ok: true, node: process.version, time: new Date().toISOString() });
}
