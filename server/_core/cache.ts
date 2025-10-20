/**
 * Sistema de cache em memória para melhorar performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutos default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Limpeza automática a cada 5 minutos
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Armazenar item no cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Se o cache está cheio, remover o item mais antigo
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Recuperar item do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar se o item expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Verificar se uma chave existe no cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remover item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpar itens expirados
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: string;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Implementar contador de hits/misses se necessário
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)}KB`,
    };
  }

  /**
   * Wrapper para cache com função de fallback
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fallback();
    this.set(key, data, ttl);
    return data;
  }
}

// Instância global do cache
export const cache = new MemoryCache();

/**
 * Cache específico para usuários (TTL menor para dados sensíveis)
 */
export const userCache = new MemoryCache(500, 60000); // 1 minuto

/**
 * Cache específico para periódicos (TTL maior para dados estáticos)
 */
export const periodicoCache = new MemoryCache(1000, 1800000); // 30 minutos

/**
 * Cache específico para estatísticas (TTL médio)
 */
export const statsCache = new MemoryCache(100, 600000); // 10 minutos

/**
 * Decorador para cache automático de métodos
 */
export function Cacheable(ttl?: number, cacheInstance: MemoryCache = cache) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
      return cacheInstance.getOrSet(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

/**
 * Invalidar cache por padrão de chave
 */
export function invalidatePattern(pattern: string, cacheInstance: MemoryCache = cache): void {
  const regex = new RegExp(pattern);
  const keysToDelete: string[] = [];
  
  // Acessar as chaves através da instância privada (hack necessário)
  const cacheMap = (cacheInstance as any).cache as Map<string, any>;
  
  for (const key of cacheMap.keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cacheInstance.delete(key));
}

/**
 * Middleware para cache de respostas HTTP
 */
export function cacheMiddleware(ttl: number = 300000) {
  return (req: any, res: any, next: any) => {
    const cacheKey = `http:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    // Apenas GET requests são cacheáveis
    if (req.method !== 'GET') {
      return next();
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Interceptar res.json para cachear a resposta
    const originalJson = res.json;
    res.json = function (data: any) {
      cache.set(cacheKey, data, ttl);
      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Limpar cache relacionado a um usuário
 */
export function clearUserCache(userId: string): void {
  invalidatePattern(`.*user.*${userId}.*`, userCache);
  invalidatePattern(`.*${userId}.*`, cache);
}

/**
 * Limpar cache relacionado a um periódico
 */
export function clearPeriodicoCache(periodicoId: string): void {
  invalidatePattern(`.*periodico.*${periodicoId}.*`, periodicoCache);
  invalidatePattern(`.*${periodicoId}.*`, cache);
}

/**
 * Limpar cache de estatísticas
 */
export function clearStatsCache(): void {
  invalidatePattern('.*stats.*', statsCache);
  invalidatePattern('.*dashboard.*', cache);
}
