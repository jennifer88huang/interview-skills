const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "storage-sync", "data");
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");

[DATA_DIR, SESSIONS_DIR].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain', '.md': 'text/plain',
};

const INJECT_HEAD = '\n<link rel="stylesheet" href="/extensions/export-md/export-md.css">\n<link rel="stylesheet" href="/extensions/mic-input/mic-input.css">\n';
const INJECT_BODY = '\n<script src="/extensions/model-config/model-config.js"></script>\n<script src="/extensions/export-md/export-md.js"></script>\n<script src="/extensions/mic-input/mic-input.js"></script>\n<script>setInterval(function(){fetch("/api/heartbeat")},5000)</script>\n</body>';
// Injected BETWEEN storage.js and app.js
const STORAGE_SYNC = '<script src="/extensions/storage-sync/storage-sync.js"></script>';
let lastHeartbeat = 0; // only start counting after first heartbeat

// ── JSON helpers ─────────────────────────────────────────────

function readJSON(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null; } catch { return null; } }
function writeJSON(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8'); }
function sendJSON(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
  return true;
}
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : null); } catch { resolve(null); } });
  });
}

// ── API ──────────────────────────────────────────────────────

async function handleAPI(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method;
  const body = (method === 'POST' || method === 'PUT') ? await parseBody(req) : null;

  // Sessions
  if (method === 'GET' && url === '/api/sessions') {
    const files = fs.existsSync(SESSIONS_DIR) ? fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json')) : [];
    const sessions = files.map((f) => readJSON(path.join(SESSIONS_DIR, f))).filter(Boolean)
      .map((s) => ({ id: s.id, title: s.title, company: s.settings?.company, role: s.settings?.role, round: s.round, progress: s.progress, phase: s.phase, completed: s.completed, engine: s.engine, updatedAt: s.updatedAt }))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return sendJSON(res, 200, sessions);
  }

  if (method === 'GET' && url.startsWith('/api/sessions/')) {
    const id = url.split('/api/sessions/')[1];
    const s = readJSON(path.join(SESSIONS_DIR, `${id}.json`));
    return s ? sendJSON(res, 200, s) : sendJSON(res, 404, { error: 'Not found' });
  }

  if (method === 'POST' && url === '/api/sessions') {
    if (!body?.id) return sendJSON(res, 400, { error: 'Missing id' });
    writeJSON(path.join(SESSIONS_DIR, `${body.id}.json`), body);
    // Update index
    const idx = readJSON(path.join(DATA_DIR, 'session-index.json')) || [];
    const entry = { id: body.id, title: body.title, company: body.settings?.company, role: body.settings?.role, round: body.round, progress: body.progress, phase: body.phase, completed: body.completed, engine: body.engine, updatedAt: body.updatedAt };
    writeJSON(path.join(DATA_DIR, 'session-index.json'), [entry, ...idx.filter((e) => e.id !== body.id)].slice(0, 50));
    return sendJSON(res, 200, { ok: true });
  }

  if (method === 'DELETE' && url.startsWith('/api/sessions/')) {
    const id = url.split('/api/sessions/')[1];
    const fp = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    const idx = (readJSON(path.join(DATA_DIR, 'session-index.json')) || []).filter((e) => e.id !== id);
    writeJSON(path.join(DATA_DIR, 'session-index.json'), idx);
    return sendJSON(res, 200, { ok: true });
  }

  // Session index
  if (method === 'GET' && url === '/api/session-index') return sendJSON(res, 200, readJSON(path.join(DATA_DIR, 'session-index.json')) || []);
  if (method === 'POST' && url === '/api/session-index') { writeJSON(path.join(DATA_DIR, 'session-index.json'), body || []); return sendJSON(res, 200, { ok: true }); }

  // Preferences
  if (method === 'GET' && url === '/api/preferences') return sendJSON(res, 200, readJSON(path.join(DATA_DIR, 'preferences.json')) || {});
  if (method === 'POST' && url === '/api/preferences') { writeJSON(path.join(DATA_DIR, 'preferences.json'), body || {}); return sendJSON(res, 200, { ok: true }); }

  // Credentials
  if (method === 'GET' && url === '/api/credentials') return sendJSON(res, 200, readJSON(path.join(DATA_DIR, 'credentials.json')));
  if (method === 'POST' && url === '/api/credentials') { writeJSON(path.join(DATA_DIR, 'credentials.json'), body || {}); return sendJSON(res, 200, { ok: true }); }
  if (method === 'DELETE' && url === '/api/credentials') { const fp = path.join(DATA_DIR, 'credentials.json'); if (fs.existsSync(fp)) fs.unlinkSync(fp); return sendJSON(res, 200, { ok: true }); }

  if (method === 'GET' && url === '/api/heartbeat') { lastHeartbeat = Date.now(); return sendJSON(res, 200, { ok: true }); }

  return false; // not an API route
}

// ── Static files ─────────────────────────────────────────────

function serveStatic(res, filePath) {
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(filePath)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); return; }
  if (fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); return; }
  }

  const ext = path.extname(filePath).toLowerCase();
  let content = fs.readFileSync(filePath);

  if (ext === '.html') {
    let html = content.toString('utf-8');
    html = html.replace('</head>', `${INJECT_HEAD}</head>`);
    // Inject storage-sync.js RIGHT AFTER storage.js, so it patches InterviewStorage before app.js runs
    html = html.replace(/(<script[^>]*src="\.\/storage\.js[^"]*"[^>]*><\/script>)/i, '$1\n' + STORAGE_SYNC);
    html = html.replace('</body>', INJECT_BODY);
    content = Buffer.from(html, 'utf-8');
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(content);
}

// ── Server ──────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }
  if (await handleAPI(req, res)) return;
  const urlPath = req.url.split('?')[0];
  serveStatic(res, path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
});

server.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}/`);
  console.log(`Interview: http://localhost:${PORT}/ui/`);
  console.log(`Data: ${DATA_DIR}`);
});

// Auto-exit when no heartbeat for 15s (browser closed)
setInterval(() => {
  if (lastHeartbeat && Date.now() - lastHeartbeat > 15000) {
    console.log('Browser closed, exiting...');
    process.exit(0);
  }
}, 5000);
