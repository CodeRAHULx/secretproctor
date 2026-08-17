const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class AuditController {
    exportAuditReport(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const reportData = JSON.parse(body || '{}');
                const logDir = config.PATHS.AUDIT_LOGS_DIR;
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }

                const filename = `Audit_Report_${Date.now()}.json`;
                const filePath = path.join(logDir, filename);

                fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename, savedPath: filePath }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
}

module.exports = new AuditController();
