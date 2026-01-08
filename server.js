
const http = require('http');
const fs = require('fs');
const path = require('path');

// Global error handlers to prevent crash
process.on('uncaughtException', (err) => {
  console.error('CRITICAL SERVER ERROR (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL SERVER ERROR (Unhandled Rejection):', reason);
});

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0'; 
const PUBLIC_DIR = '.'; 

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.xml': 'text/xml',
  '.ts': 'text/plain', // Serve source as text to prevent execution errors in some contexts
  '.tsx': 'text/plain' 
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 1. Health Checks
  if (req.url === '/health' || req.url === '/_ah/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // 2. Determine File Path
  // Remove query string and decode URL encodings
  let safeUrl = req.url.split('?')[0]; 
  try {
      safeUrl = decodeURIComponent(safeUrl);
  } catch (e) {
      console.warn('Malformed URL:', req.url);
  }

  if (safeUrl === '/') safeUrl = '/index.html';

  // Prevent Path Traversal
  const normalizedPath = path.normalize(safeUrl).replace(/^(\.\.[\/\\])+/, '');
  let fullPath = path.join(PUBLIC_DIR, normalizedPath);

  // 3. Serve File with SPA Fallback
  const serveFile = (filePath, isFallback = false) => {
      fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
              // File not found
              const ext = path.extname(filePath).toLowerCase();
              
              // If it looks like an asset (has extension), return 404
              // If it looks like a route (no extension or .html), serve index.html (SPA Fallback)
              const isAsset = ['.js', '.css', '.png', '.jpg', '.ico', '.svg', '.json', '.woff', '.woff2', '.ttf'].includes(ext);
              
              if (!isFallback && !isAsset) {
                  console.log(`Fallback to index.html for: ${filePath}`);
                  serveFile(path.join(PUBLIC_DIR, 'index.html'), true);
                  return;
              }

              console.warn(`404 Not Found: ${filePath}`);
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
          }

          // File Exists - Read and Serve
          fs.readFile(filePath, (readErr, content) => {
              if (readErr) {
                  console.error(`500 Read Error: ${filePath}`, readErr);
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('Server Error');
                  return;
              }

              const ext = path.extname(filePath).toLowerCase();
              const contentType = mimeTypes[ext] || 'application/octet-stream';
              
              res.writeHead(200, { 
                  'Content-Type': contentType,
                  'Cache-Control': isFallback ? 'no-cache' : 'public, max-age=3600'
              });
              res.end(content);
          });
      });
  };

  serveFile(fullPath);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
