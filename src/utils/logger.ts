/**
 * Logging utility for the n8n Workflow MCP Server
 */

import type { LogLevel } from '../models/types';

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

let currentLogLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLogLevel)) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data) {
      console[level](`${prefix} ${message}`, JSON.stringify(data));
    } else {
      console[level](`${prefix} ${message}`);
    }
  }
}
