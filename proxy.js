const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function proxyPost(urlPath, reqBody, callback) {
  const url = new URL(urlPath);
  const data = JSON.stringify(reqBody);
  const opts = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
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
  r.write(data);
  r.end();
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/device-code') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      proxyPost('https://github.com/login/device/code', body, (err, data) => {
        if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/device-token') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      proxyPost('https://github.com/login/oauth/access_token', body, (err, data) => {
        if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      });
    });
    return;
  }

  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  p = path.join('.', p);
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('PRISM proxy at http://localhost:' + PORT));
