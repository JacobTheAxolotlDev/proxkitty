const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function safeFilePath(urlPath) {
  const normalized = path.normalize(urlPath).replace(/^\/+/, '');
  const candidate = path.join(PUBLIC_DIR, normalized || 'index.html');

  if (!candidate.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return candidate;
}

function rewriteHtmlDocument(html, targetUrl) {
  const baseTag = `<base href="${targetUrl}">`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }

  return `${baseTag}${html}`;
}

function proxyRequest(target, res) {
  const upstreamUrl = new URL(target);
  const client = upstreamUrl.protocol === 'https:' ? https : http;

  const request = client.request(
    upstreamUrl,
    {
      method: 'GET',
      headers: {
        'User-Agent': 'ProxKitty/1.0',
        Accept: '*/*'
      }
    },
    (upstreamRes) => {
      const statusCode = upstreamRes.statusCode || 500;
      const contentType = upstreamRes.headers['content-type'] || 'text/plain; charset=utf-8';

      if (String(contentType).includes('text/html')) {
        let body = '';
        upstreamRes.setEncoding('utf8');
        upstreamRes.on('data', (chunk) => {
          body += chunk;
        });
        upstreamRes.on('end', () => {
          const rewritten = rewriteHtmlDocument(body, upstreamUrl.toString());
          res.writeHead(statusCode, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Proxkitty-Engine': 'scramjet-compatible'
          });
          res.end(rewritten);
        });
        return;
      }

      res.writeHead(statusCode, {
        'Content-Type': String(contentType),
        'X-Proxkitty-Engine': 'scramjet-compatible'
      });
      upstreamRes.pipe(res);
    }
  );

  request.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Proxy request failed.');
  });

  request.end();
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/scramjet/proxy') {
    const target = requestUrl.searchParams.get('url');

    if (!target) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Missing url parameter');
      return;
    }

    try {
      const parsed = new URL(target);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol');
      }
      proxyRequest(parsed.toString(), res);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Invalid URL');
    }
    return;
  }

  let filePath = safeFilePath(requestUrl.pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (requestUrl.pathname === '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      sendFile(path.join(PUBLIC_DIR, 'index.html'), res);
      return;
    }

    if (stats.isDirectory()) {
      sendFile(path.join(filePath, 'index.html'), res);
      return;
    }

    sendFile(filePath, res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`ProxKitty running on http://${HOST}:${PORT}`);
});
