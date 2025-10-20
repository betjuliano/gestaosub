import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

/**
 * Production security configuration
 */
export class SecurityConfig {
  /**
   * Configure CORS for production domains
   */
  static getCorsConfig() {
    const corsOrigin = process.env.CORS_ORIGIN || 'https://gestaodeartigos.iaprojetos.com.br';
    const corsCredentials = process.env.CORS_CREDENTIALS === 'true';
    
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // In production, only allow specific origins
        if (process.env.NODE_ENV === 'production') {
          const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          } else {
            return callback(new Error('Not allowed by CORS'), false);
          }
        }
        
        // In development, allow all origins
        return callback(null, true);
      },
      credentials: corsCredentials,
      methods: process.env.CORS_METHODS?.split(',') || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      optionsSuccessStatus: 200,
    });
  }

  /**
   * Configure security headers with Helmet
   */
  static getHelmetConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return helmet({
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https:", "wss:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      } : false,
      hsts: isProduction ? {
        maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true',
        preload: process.env.HSTS_PRELOAD === 'true'
      } : false,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
      dnsPrefetchControl: { allow: false },
      ieNoOpen: true,
      crossdomain: false,
      permittedCrossDomainPolicies: false,
    });
  }

  /**
   * Configure rate limiting
   */
  static getRateLimitConfig() {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    
    return rateLimit({
      windowMs,
      max: maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * Configure API-specific rate limiting
   */
  static getApiRateLimitConfig() {
    const windowMs = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000');
    const maxRequests = parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '30');
    
    return rateLimit({
      windowMs,
      max: maxRequests,
      message: {
        error: 'Too many API requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      }
    });
  }

  /**
   * Configure compression middleware
   */
  static getCompressionConfig() {
    return compression({
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
      threshold: 1024,
      filter: (req: Request, res: Response) => {
        if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Security logging middleware
   */
  static securityLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const securityEvents = ['login', 'logout', 'password-reset', 'account-creation', 'permission-change'];
      const path = req.path.toLowerCase();
      const isSecurityEvent = securityEvents.some(event => path.includes(event));

      if (isSecurityEvent) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'security_event',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          referer: req.get('Referer')
        }));
      }
      next();
    };
  }

  /**
   * Request ID middleware for tracing
   */
  static requestId() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.get('X-Request-ID') || 
                       req.get('X-Correlation-ID') || 
                       Math.random().toString(36).substring(2, 15);
      
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    };
  }

  /**
   * Trust proxy configuration for production
   */
  static configureTrustProxy(app: any) {
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }
  }
}

/**
 * Apply all security middleware to Express app
 */
export function applySecurityMiddleware(app: any) {
  SecurityConfig.configureTrustProxy(app);

  if (process.env.ENABLE_COMPRESSION !== 'false') {
    app.use(SecurityConfig.getCompressionConfig());
  }

  if (process.env.ENABLE_SECURITY_HEADERS !== 'false') {
    app.use(SecurityConfig.getHelmetConfig());
  }

  app.use(SecurityConfig.getCorsConfig());
  app.use(SecurityConfig.requestId());
  app.use(SecurityConfig.securityLogger());
  app.use(SecurityConfig.getRateLimitConfig());
  app.use('/api', SecurityConfig.getApiRateLimitConfig());
}