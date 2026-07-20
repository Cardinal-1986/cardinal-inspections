// Diagnostic ping — upload to api/ping.js, then I'll probe it.
module.exports = (req, res) => {
  res.status(200).json({ ok: true, node: process.version, time: new Date().toISOString() });
};
