"use strict";
/**
 * Structured Logger for Source Registry
 * Provides auditable, structured logging for all registry operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.RegistryLogger = void 0;
class RegistryLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }
    formatLog(log) {
        const { timestamp, level, action, message, sourceId, assetId, url, duration, details } = log;
        const parts = [
            `[${timestamp}]`,
            `[${level.toUpperCase()}]`,
            `[source-registry]`,
            `[${action}]`,
            message,
        ];
        if (sourceId)
            parts.push(`source=${sourceId}`);
        if (assetId)
            parts.push(`asset=${assetId}`);
        if (url)
            parts.push(`url=${url}`);
        if (duration !== undefined)
            parts.push(`duration=${duration}ms`);
        if (details)
            parts.push(`details=${JSON.stringify(details)}`);
        return parts.join(' ');
    }
    log(level, action, message, extra) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: 'source-registry',
            action,
            message,
            ...extra,
        };
        // Keep in-memory log buffer
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        // Output to console
        const formatted = this.formatLog(logEntry);
        switch (level) {
            case 'debug':
                console.debug(formatted);
                break;
            case 'info':
                console.info(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
                console.error(formatted);
                break;
        }
    }
    debug(action, message, extra) {
        this.log('debug', action, message, extra);
    }
    info(action, message, extra) {
        this.log('info', action, message, extra);
    }
    warn(action, message, extra) {
        this.log('warn', action, message, extra);
    }
    error(action, message, extra) {
        this.log('error', action, message, extra);
    }
    /**
     * Get recent logs for debugging
     */
    getRecentLogs(count = 100) {
        return this.logs.slice(-count);
    }
    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }
}
exports.RegistryLogger = RegistryLogger;
// Singleton instance
exports.logger = new RegistryLogger();
