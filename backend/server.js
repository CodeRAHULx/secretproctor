const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { connectDB } = require('./config/db');
const handleApiRoutes = require('./routes/apiRoutes');
const nativeWatchdogService = require('./services/nativeWatchdogService');

// Initialize MongoDB Connection
connectDB();

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Check if request matches any API route
    if (handleApiRoutes(req, res)) {
        return;
    }

    if (res.headersSent) {
        return;
    }

    // Static Asset Serving from frontend/public
    const sanitizedUrl = req.url.split('?')[0];
    let filePath = path.join(config.PATHS.FRONTEND_PUBLIC, sanitizedUrl === '/' ? 'index.html' : sanitizedUrl);
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (res.headersSent) return;

        if (error) {
            if (error.code === 'ENOENT' && !path.extname(sanitizedUrl)) {
                fs.readFile(path.join(config.PATHS.FRONTEND_PUBLIC, 'index.html'), (indexError, index) => {
                    if (indexError) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Frontend build not found. Run npm run build from SecureMeet.'); return; }
                    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(index, 'utf-8');
                });
            } else if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start Native Watchdog Service
nativeWatchdogService.start();

server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${config.PORT} is already in use.`);
        console.error(`   Run this to free it:\n   for /f "tokens=5" %a in ('netstat -ano ^| findstr :${config.PORT}') do taskkill /PID %a /F\n`);
        process.exit(1);
    } else {
        throw err;
    }
});

process.on('SIGINT', () => { server.close(() => process.exit(0)); });

server.listen(config.PORT, config.HOST, () => {
    console.log(`=============================================================`);
    console.log(`  🛡️  SecureMeet: Enterprise MVC Proctoring Platform        `);
    console.log(`  🚀 Server Running: http://${config.HOST}:${config.PORT}   `);
    console.log(`  📡 Native Watchdog: Active (Polling ${config.SCAN_INTERVAL_MS}ms) `);
    console.log(`=============================================================`);
});
