"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class AppLogger {
    write(level, scope, message, meta) {
        const payload = meta ? { ...meta } : undefined;
        const prefix = `[${scope}]`;
        switch (level) {
            case 'debug':
                console.debug(prefix, message, payload || '');
                break;
            case 'info':
                console.info(prefix, message, payload || '');
                break;
            case 'warn':
                console.warn(prefix, message, payload || '');
                break;
            case 'error':
                console.error(prefix, message, payload || '');
                break;
        }
    }
    debug(scope, message, meta) {
        this.write('debug', scope, message, meta);
    }
    info(scope, message, meta) {
        this.write('info', scope, message, meta);
    }
    warn(scope, message, meta) {
        this.write('warn', scope, message, meta);
    }
    error(scope, message, meta) {
        this.write('error', scope, message, meta);
    }
}
exports.logger = new AppLogger();
