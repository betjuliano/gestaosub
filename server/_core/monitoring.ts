/**
 * Sistema de monitoramento de performance e saúde da aplicação
 */

import { logger } from './logger';
import { cache, userCache, periodicoCache, statsCache } from './cache';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cache: {
    main: any;
    user: any;
    periodico: any;
    stats: any;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
  };
  performance: {
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
  };
}

class PerformanceMonitor {
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  /**
   * Registrar tempo de resposta de uma requisição
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestTimes.push(responseTime);
    this.requestCount++;
    
    if (isError) {
      this.errorCount++;
    }

    // Manter apenas os últimos 1000 tempos de resposta
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
  }

  /**
   * Obter métricas de performance
   */
  getMetrics(): SystemMetrics['performance'] {
    const avgResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;

    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;

    return {
      avgResponseTime: Math.round(avgResponseTime),
      requestCount: this.requestCount,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Resetar métricas
   */
  reset(): void {
    this.requestTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();

/**
 * Verificar saúde do banco de dados
 */
async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    
    if (!db) {
      return {
        name: 'database',
        status: 'unhealthy',
        error: 'Database connection not available',
      };
    }

    // Teste simples de conectividade
    await db.execute('SELECT 1');
    const responseTime = Date.now() - start;

    return {
      name: 'database',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      details: {
        connectionPool: 'active',
      },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: (error as Error).message,
    };
  }
}

/**
 * Verificar saúde do sistema de cache
 */
function checkCacheHealth(): HealthCheck {
  try {
    const mainStats = cache.getStats();
    const userStats = userCache.getStats();
    const periodicoStats = periodicoCache.getStats();
    const statsStats = statsCache.getStats();

    const totalMemoryUsage = [mainStats, userStats, periodicoStats, statsStats]
      .reduce((total, stats) => {
        const usage = parseInt(stats.memoryUsage.replace('KB', ''));
        return total + (isNaN(usage) ? 0 : usage);
      }, 0);

    return {
      name: 'cache',
      status: totalMemoryUsage > 10000 ? 'degraded' : 'healthy', // 10MB threshold
      details: {
        main: mainStats,
        user: userStats,
        periodico: periodicoStats,
        stats: statsStats,
        totalMemoryUsage: `${totalMemoryUsage}KB`,
      },
    };
  } catch (error) {
    return {
      name: 'cache',
      status: 'unhealthy',
      error: (error as Error).message,
    };
  }
}

/**
 * Verificar uso de memória do sistema
 */
function checkMemoryHealth(): HealthCheck {
  try {
    const memUsage = process.memoryUsage();
    const totalMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const memoryPercentage = (heapUsedMB / heapTotalMB) * 100;

    return {
      name: 'memory',
      status: memoryPercentage > 90 ? 'unhealthy' : memoryPercentage > 70 ? 'degraded' : 'healthy',
      details: {
        rss: `${totalMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        percentage: `${Math.round(memoryPercentage)}%`,
      },
    };
  } catch (error) {
    return {
      name: 'memory',
      status: 'unhealthy',
      error: (error as Error).message,
    };
  }
}

/**
 * Executar todas as verificações de saúde
 */
export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    Promise.resolve(checkCacheHealth()),
    Promise.resolve(checkMemoryHealth()),
  ]);

  return checks.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const names = ['database', 'cache', 'memory'];
      return {
        name: names[index],
        status: 'unhealthy' as const,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

/**
 * Obter métricas completas do sistema
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  const healthChecks = await runHealthChecks();
  const memUsage = process.memoryUsage();
  
  const databaseCheck = healthChecks.find(check => check.name === 'database');
  const cacheCheck = healthChecks.find(check => check.name === 'cache');

  return {
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cache: {
      main: cache.getStats(),
      user: userCache.getStats(),
      periodico: periodicoCache.getStats(),
      stats: statsCache.getStats(),
    },
    database: {
      status: databaseCheck?.status === 'healthy' ? 'connected' : 
               databaseCheck?.status === 'degraded' ? 'connected' : 'error',
      responseTime: databaseCheck?.responseTime,
    },
    performance: performanceMonitor.getMetrics(),
  };
}

/**
 * Middleware para monitoramento de requisições
 */
export function monitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    // Override do res.end para capturar métricas
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const responseTime = Date.now() - start;
      const isError = res.statusCode >= 400;
      
      performanceMonitor.recordRequest(responseTime, isError);

      // Log de performance para requisições lentas
      if (responseTime > 5000) {
        logger.warn(`SLOW_REQUEST: ${req.method} ${req.path} took ${responseTime}ms`, {
          method: req.method,
          path: req.path,
          responseTime,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Endpoint de health check
 */
export async function healthCheckEndpoint(req: any, res: any) {
  try {
    const checks = await runHealthChecks();
    const overallStatus = checks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : checks.some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      checks,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed', {}, error as Error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
}

/**
 * Endpoint de métricas detalhadas
 */
export async function metricsEndpoint(req: any, res: any) {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed', {}, error as Error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Configurar monitoramento automático
 */
export function setupMonitoring(): void {
  // Log de métricas a cada 5 minutos
  setInterval(async () => {
    try {
      const metrics = await getSystemMetrics();
      logger.info('SYSTEM_METRICS', {
        uptime: metrics.uptime,
        memory: metrics.memory,
        performance: metrics.performance,
        database: metrics.database.status,
      });
    } catch (error) {
      logger.error('Failed to collect system metrics', {}, error as Error);
    }
  }, 300000); // 5 minutos

  // Resetar métricas de performance a cada hora
  setInterval(() => {
    performanceMonitor.reset();
    logger.info('Performance metrics reset');
  }, 3600000); // 1 hora

  // Limpeza de cache a cada 30 minutos
  setInterval(() => {
    cache.cleanup();
    userCache.cleanup();
    periodicoCache.cleanup();
    statsCache.cleanup();
    logger.debug('Cache cleanup completed');
  }, 1800000); // 30 minutos
}
