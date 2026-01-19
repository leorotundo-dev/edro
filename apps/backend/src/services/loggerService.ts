/**
 * Logger Service
 * 
 * Sistema de logs estruturados
 */

import fs from 'fs';
import path from 'path';

// ============================================
// TIPOS
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_DIR = process.env.LOG_DIR || './logs';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================
// LOGGER CLASS
// ============================================

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any, data?: any) {
    this.log('error', message, data, error);
  }

  fatal(message: string, error?: Error | any, data?: any) {
    this.log('fatal', message, data, error);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error | any) {
    // Verificar se deve logar baseado no nível
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[LOG_LEVEL]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data,
    };

    // Adicionar erro se presente
    if (error) {
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          stack: error.stack,
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    // Output console
    this.outputConsole(entry);

    // Output arquivo
    if (LOG_TO_FILE) {
      this.outputFile(entry);
    }
  }

  private outputConsole(entry: LogEntry) {
    const color = this.getColorForLevel(entry.level);
    const reset = '\x1b[0m';
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    
    let output = `${color}[${timestamp}] [${entry.level.toUpperCase()}]`;
    
    if (entry.context) {
      output += ` [${entry.context}]`;
    }
    
    output += ` ${entry.message}${reset}`;

    if (entry.data) {
      output += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack && entry.level === 'fatal') {
        output += `\n${entry.error.stack}`;
      }
    }

    console.log(output);
  }

  private outputFile(entry: LogEntry) {
    try {
      // Criar diretório se não existe
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      // Nome do arquivo por data
      const date = new Date().toISOString().split('T')[0];
      const filename = path.join(LOG_DIR, `${date}.log`);

      // Escrever log
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(filename, line, 'utf8');
    } catch (err) {
      console.error('Failed to write log to file:', err);
    }
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case 'debug': return '\x1b[36m'; // Cyan
      case 'info': return '\x1b[32m';  // Green
      case 'warn': return '\x1b[33m';  // Yellow
      case 'error': return '\x1b[31m'; // Red
      case 'fatal': return '\x1b[35m'; // Magenta
      default: return '\x1b[37m';      // White
    }
  }
}

// ============================================
// FACTORY
// ============================================

export function createLogger(context?: string): Logger {
  return new Logger(context);
}

// ============================================
// DEFAULT LOGGER
// ============================================

export const logger = new Logger();

// ============================================
// LOG ROTATION
// ============================================

export function rotateOldLogs(daysToKeep: number = 30) {
  if (!LOG_TO_FILE) return;

  try {
    if (!fs.existsSync(LOG_DIR)) return;

    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filepath = path.join(LOG_DIR, file);
      const stat = fs.statSync(filepath);
      const age = now - stat.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        logger.info(`Rotated old log file: ${file}`);
      }
    });
  } catch (err) {
    logger.error('Failed to rotate logs', err);
  }
}

// ============================================
// REQUEST LOGGER
// ============================================

export function logRequest(method: string, path: string, statusCode: number, duration: number) {
  const level = statusCode >= 500 ? 'error' 
    : statusCode >= 400 ? 'warn' 
    : 'info';

  logger.log(level, `${method} ${path}`, {
    statusCode,
    duration: `${duration}ms`,
  }, undefined);
}

// ============================================
// STRUCTURED LOGGING
// ============================================

export function logEvent(event: string, data?: any) {
  logger.info(`Event: ${event}`, data);
}

export function logMetric(metric: string, value: number, unit?: string) {
  logger.info(`Metric: ${metric}`, {
    value,
    unit,
  });
}

export function logQuery(query: string, duration: number) {
  logger.debug(`Query executed`, {
    query,
    duration: `${duration}ms`,
  });
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const LoggerService = {
  createLogger,
  logger,
  rotateOldLogs,
  logRequest,
  logEvent,
  logMetric,
  logQuery,
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, err?: any, data?: any) => logger.error(message, err, data),
};

export default LoggerService;
