const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 16 * 1024;
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function proxyPost(urlPath, bodyStr, callback) {
  const url = new URL(urlPath);
  const opts = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(bodyStr),
      'User-Agent': 'PRISM/1.0'
    }
  };
  const r = https.request(opts, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      try { callback(null, JSON.parse(body)); }
      catch { callback(null, body); }
    });
  });
  r.on('error', callback);
  r.write(bodyStr);
  r.end();
}

http.createServer((req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/device-code' || req.url === '/api/device-token')) {
    let body = '';
    let bytes = 0;
    let tooLarge = false;
    req.on('data', c => {
      if (tooLarge) return;
      bytes += c.length;
      if (bytes > MAX_BODY_BYTES) {
        tooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json', 'Connection': 'close' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
      body += c;
    });
    req.on('end', () => {
      if (tooLarge) return;
      const upstream = req.url === '/api/device-code'
        ? 'https://github.com/login/device/code'
        : 'https://github.com/login/oauth/access_token';
      proxyPost(upstream, body, (err, data) => {
        if (err) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'GitHub OAuth request failed' })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      });
    });
    return;
  }

  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  // Resolve against the web root and confirm the result stays inside it.
  // Without this check a request like `/../../etc/passwd` escapes the
  // serving directory and reads arbitrary files (directory traversal).
  const root = path.resolve('.');
  const p = path.resolve(root, '.' + path.posix.normalize(reqPath));
  if (p !== root && !p.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, HOST, () => console.log(`PRISM proxy at http://${HOST}:${PORT}`));
