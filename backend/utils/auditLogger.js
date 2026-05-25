// Audit logging utility for admin actions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const auditLogFile = path.join(logDir, 'audit.log');

export const auditLog = (action, userId, userType, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId,
    userType,
    details,
    ip: details.ip || 'unknown'
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  // Append to audit log file
  fs.appendFileSync(auditLogFile, logLine, 'utf8');
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT] ${timestamp} - ${action} by ${userType} ${userId}`);
  }
};

// Middleware to automatically log requests
export const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.user && req.method !== 'GET') {
      auditLog(
        `${req.method} ${req.path}`,
        req.user.id,
        req.user.type || 'admin',
        {
          ip: req.ip || req.connection?.remoteAddress,
          statusCode: res.statusCode,
          body: req.body
        }
      );
    }
    return originalSend.call(this, data);
  };
  next();
};