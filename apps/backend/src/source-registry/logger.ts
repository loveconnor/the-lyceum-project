/**
 * Structured Logger for Source Registry
 * Provides auditable, structured logging for all registry operations
 */

import type { StructuredLog } from './types';

export class RegistryLogger {
  private logs: StructuredLog[] = [];
  private maxLogs = 1000;

  private formatLog(log: StructuredLog): string {
    const { timestamp, level, action, message, sourceId, assetId, url, duration, details } = log;
    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      `[source-registry]`,
      `[${action}]`,
      message,
    ];
    
    if (sourceId) parts.push(`source=${sourceId}`);
    if (assetId) parts.push(`asset=${assetId}`);
    if (url) parts.push(`url=${url}`);
    if (duration !== undefined) parts.push(`duration=${duration}ms`);
    if (details) parts.push(`details=${JSON.stringify(details)}`);
    
    return parts.join(' ');
  }

  private log(
    level: StructuredLog['level'],
    action: string,
    message: string,
    extra?: Partial<Pick<StructuredLog, 'sourceId' | 'assetId' | 'url' | 'duration' | 'details'>>
  ): void {
    const logEntry: StructuredLog = {
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

  debug(action: string, message: string, extra?: Partial<Pick<StructuredLog, 'sourceId' | 'assetId' | 'url' | 'duration' | 'details'>>): void {
    this.log('debug', action, message, extra);
  }

  info(action: string, message: string, extra?: Partial<Pick<StructuredLog, 'sourceId' | 'assetId' | 'url' | 'duration' | 'details'>>): void {
    this.log('info', action, message, extra);
  }

  warn(action: string, message: string, extra?: Partial<Pick<StructuredLog, 'sourceId' | 'assetId' | 'url' | 'duration' | 'details'>>): void {
    this.log('warn', action, message, extra);
  }

  error(action: string, message: string, extra?: Partial<Pick<StructuredLog, 'sourceId' | 'assetId' | 'url' | 'duration' | 'details'>>): void {
    this.log('error', action, message, extra);
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count = 100): StructuredLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// Singleton instance
export const logger = new RegistryLogger();


