export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  details?: Record<string, unknown>;
  duration?: number;
}

class AppLogger {
  private write(level: LogLevel, scope: string, message: string, meta?: LogMeta): void {
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

  debug(scope: string, message: string, meta?: LogMeta): void {
    this.write('debug', scope, message, meta);
  }

  info(scope: string, message: string, meta?: LogMeta): void {
    this.write('info', scope, message, meta);
  }

  warn(scope: string, message: string, meta?: LogMeta): void {
    this.write('warn', scope, message, meta);
  }

  error(scope: string, message: string, meta?: LogMeta): void {
    this.write('error', scope, message, meta);
  }
}

export const logger = new AppLogger();
