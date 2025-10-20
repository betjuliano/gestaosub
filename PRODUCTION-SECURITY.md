# Production Security Configuration Guide

This document outlines the security configurations implemented for the GestãoSub production deployment.

## 🔐 Security Features Implemented

### 1. Environment Variables and Secrets Management

#### Docker Secrets Integration
- **Location**: `server/_core/secrets.ts`
- **Purpose**: Secure handling of sensitive configuration data
- **Features**:
  - Automatic loading from Docker secrets (`/run/secrets/`)
  - Fallback to environment variables for development
  - Support for `_FILE` suffix pattern
  - Centralized secrets management

#### Production Environment Template
- **Location**: `.env.production.secure`
- **Features**:
  - Comprehensive production configuration
  - Docker secrets placeholders
  - Security-focused defaults
  - Performance optimizations

### 2. CORS Configuration

#### Production CORS Settings
- **Strict origin validation** for production environments
- **Configurable allowed origins** via `CORS_ORIGIN` environment variable
- **Credential support** with `CORS_CREDENTIALS=true`
- **Method and header restrictions** for security
- **Development flexibility** with relaxed rules for local development

#### Configuration Options
```env
CORS_ORIGIN=https://gestaodeartigos.iaprojetos.com.br
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin
```

### 3. Security Headers (Helmet.js)

#### Implemented Headers
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Browser XSS protection
- **Referrer Policy**: Controls referrer information
- **DNS Prefetch Control**: Prevents DNS prefetching

#### CSP Configuration
```javascript
defaultSrc: ["'self'"]
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
imgSrc: ["'self'", "data:", "https:", "blob:"]
fontSrc: ["'self'", "https://fonts.gstatic.com"]
connectSrc: ["'self'", "https:", "wss:"]
```

### 4. Rate Limiting

#### Two-Tier Rate Limiting
1. **General Rate Limiting**: 100 requests per 15 minutes
2. **API Rate Limiting**: 30 requests per minute for `/api` endpoints

#### Configuration
```env
# General rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# API rate limiting
API_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
API_RATE_LIMIT_MAX_REQUESTS=30
```

#### Features
- **IP-based tracking** with proxy support
- **Standardized headers** for rate limit information
- **Custom error responses** with retry information
- **Configurable skip options** for successful/failed requests

### 5. Additional Security Middleware

#### Compression
- **Configurable compression** with security considerations
- **Threshold-based compression** (1KB minimum)
- **Cache-Control respect** for no-transform directives

#### Security Logging
- **Automatic logging** of security-relevant events
- **Structured JSON logging** for analysis
- **IP and User-Agent tracking** for forensics

#### Request Tracing
- **Unique request IDs** for debugging
- **Correlation ID support** for distributed tracing
- **Header propagation** for request tracking

## 🚀 Deployment Configuration

### Docker Compose Security

#### Network Isolation
```yaml
networks:
  web:
    external: true      # Public network for Traefik
  internal:
    driver: bridge      # Private network for app-db communication
    internal: true      # No external access
```

#### Secrets Management
```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  cookie_secret:
    file: ./secrets/cookie_secret.txt
  # ... additional secrets
```

#### Traefik Security Labels
```yaml
labels:
  # Security headers at proxy level
  - "traefik.http.middlewares.security-headers.headers.sslredirect=true"
  - "traefik.http.middlewares.security-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.security-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
  - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
  - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
  
  # Rate limiting at proxy level
  - "traefik.http.middlewares.rate-limit.ratelimit.average=100"
  - "traefik.http.middlewares.rate-limit.ratelimit.period=1m"
  - "traefik.http.middlewares.rate-limit.ratelimit.burst=50"
```

### SSL/TLS Configuration

#### Automatic Certificate Management
- **Let's Encrypt integration** via Traefik
- **Automatic renewal** of certificates
- **HTTPS-only enforcement** with redirects
- **HSTS headers** for browser security

## 🛠️ Setup Instructions

### 1. Generate Secrets

#### Using PowerShell (Windows)
```powershell
.\scripts\generate-secrets.ps1
```

#### Using Bash (Linux/macOS)
```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

### 2. Configure Environment

1. **Copy the production template**:
   ```bash
   cp .env.production.secure .env.production
   ```

2. **Update domain configuration**:
   ```env
   DOMAIN=gestaodeartigos.iaprojetos.com.br
   ACME_EMAIL=admin@iaprojetos.com.br
   ```

3. **Configure optional services** (AWS S3, SMTP, etc.)

### 3. Deploy with Security

1. **Create external network**:
   ```bash
   docker network create web
   ```

2. **Deploy the stack**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Verify security**:
   ```bash
   curl -I https://yourdomain.com/api/health
   ```

## 🔍 Security Verification

### Health Check Endpoint

The `/api/health` endpoint now includes security status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "security": {
    "corsEnabled": true,
    "helmetEnabled": true,
    "rateLimitEnabled": true,
    "compressionEnabled": true,
    "httpsOnly": true
  }
}
```

### Security Testing

#### Test HTTPS Redirect
```bash
curl -I http://yourdomain.com
# Should return 301/302 redirect to HTTPS
```

#### Test Security Headers
```bash
curl -I https://yourdomain.com
# Check for security headers in response
```

#### Test Rate Limiting
```bash
# Test general rate limit
for i in {1..105}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/api/health; done

# Test API rate limit
for i in {1..35}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/api/trpc/health; done
```

#### Test CORS
```bash
curl -H "Origin: https://malicious-site.com" -I https://yourdomain.com/api/health
# Should be blocked in production
```

## 🚨 Security Monitoring

### Log Analysis

Security events are logged in structured JSON format:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "type": "security_event",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "path": "/api/login",
  "method": "POST",
  "referer": "https://yourdomain.com"
}
```

### Alerts and Monitoring

Monitor these security metrics:
- **Rate limit violations** (429 responses)
- **CORS violations** (blocked requests)
- **SSL certificate expiration**
- **Failed authentication attempts**
- **Unusual traffic patterns**

## 🔄 Security Maintenance

### Regular Tasks

1. **Rotate secrets** every 90 days
2. **Update dependencies** monthly
3. **Review security logs** weekly
4. **Test backup/restore** monthly
5. **Security audit** quarterly

### Secret Rotation

```bash
# Generate new secrets
./scripts/generate-secrets.ps1 -Force

# Update running containers
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

## 📚 Security References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Traefik Security Documentation](https://doc.traefik.io/traefik/middlewares/overview/)

## ⚠️ Security Considerations

### Known Limitations

1. **CSP Relaxed for Development**: `unsafe-inline` and `unsafe-eval` are allowed for React/Vite compatibility
2. **Rate Limiting Bypass**: Authenticated users are not exempt from rate limits
3. **IP-based Tracking**: May not work correctly behind certain proxy configurations

### Recommendations

1. **Use a Web Application Firewall (WAF)** for additional protection
2. **Implement intrusion detection** for advanced threat monitoring
3. **Regular penetration testing** to identify vulnerabilities
4. **Security training** for development team
5. **Incident response plan** for security breaches