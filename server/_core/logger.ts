/**
 * Sistema de logging estruturado para produção
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(level: string, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      // Remover informações sensíveis do contexto
      const sanitizedContext = { ...context };
      delete sanitizedContext.password;
      delete sanitizedContext.senha;
      delete sanitizedContext.token;
      delete sanitizedContext.apiKey;
      entry.context = sanitizedContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    if (this.isProduction) {
      // Em produção, usar JSON estruturado
      console.log(JSON.stringify(entry));
    } else {
      // Em desenvolvimento, usar formato mais legível
      const timestamp = entry.timestamp;
      const level = entry.level.toUpperCase().padEnd(5);
      const message = entry.message;
      const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
      const error = entry.error ? ` | ERROR: ${entry.error.message}` : '';
      
      console.log(`[${timestamp}] ${level} ${message}${context}${error}`);
      
      if (entry.error?.stack && !this.isProduction) {
        console.log(entry.error.stack);
      }
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog('error', message, context, error));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog('warn', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog('info', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog('debug', message, context));
    }
  }

  // Métodos específicos para diferentes tipos de eventos
  
  security(event: string, context?: LogContext): void {
    this.warn(`SECURITY_EVENT: ${event}`, {
      ...context,
      eventType: 'security',
    });
  }

  database(operation: string, context?: LogContext, error?: Error): void {
    if (error) {
      this.error(`DATABASE_ERROR: ${operation}`, context, error);
    } else {
      this.debug(`DATABASE: ${operation}`, context);
    }
  }

  auth(event: string, context?: LogContext, error?: Error): void {
    if (error) {
      this.warn(`AUTH_FAILED: ${event}`, context, error);
    } else {
      this.info(`AUTH: ${event}`, context);
    }
  }

  api(method: string, path: string, context?: LogContext): void {
    this.info(`API_REQUEST: ${method} ${path}`, context);
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    const message = `PERFORMANCE: ${operation} took ${duration}ms`;
    const perfContext = { ...context, duration };
    
    if (level === 'warn') {
      this.warn(message, perfContext);
    } else if (level === 'info') {
      this.info(message, perfContext);
    } else {
      this.debug(message, perfContext);
    }
  }
}

// Instância singleton do logger
export const logger = new Logger();

/**
 * Middleware para logging de requisições Express
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 15);
    
    // Adicionar requestId ao request para uso posterior
    req.requestId = requestId;
    
    const context: LogContext = {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    };

    // Log da requisição
    if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
      logger.api(req.method, req.path, context);
    }

    // Override do res.end para capturar a resposta
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - start;
      
      logger.performance(`${req.method} ${req.path}`, duration, {
        ...context,
        statusCode: res.statusCode,
      });

      // Log de erro se status >= 400
      if (res.statusCode >= 400) {
        logger.warn(`HTTP_ERROR: ${res.statusCode}`, {
          ...context,
          statusCode: res.statusCode,
          duration,
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Handler global para erros não capturados
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('UNCAUGHT_EXCEPTION', {}, error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('UNHANDLED_REJECTION', { 
      reason: reason?.message || reason,
      promise: promise.toString(),
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

/**
 * Função utilitária para medir performance de operações
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.performance(operation, duration, context);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`PERFORMANCE_ERROR: ${operation}`, { ...context, duration }, error as Error);
    throw error;
  }
}
