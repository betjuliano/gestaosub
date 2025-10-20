# Traefik Production Setup Guide

This guide provides comprehensive instructions for setting up Traefik as a reverse proxy with SSL automation for the GestãoSub application.

## Overview

Traefik is configured as the main entry point for the GestãoSub application, providing:

- **Automatic SSL/TLS certificates** via Let's Encrypt
- **HTTP to HTTPS redirection**
- **Security headers** and middleware
- **Rate limiting** protection
- **Domain-based routing**
- **Admin dashboard** with authentication

## Architecture

```
Internet → Traefik (Port 80/443) → GestãoSub App (Port 3000) → PostgreSQL (Port 5432)
```

### Network Configuration

- **External Network (`web`)**: Traefik and application containers
- **Internal Network (`internal`)**: Application and database containers
- **Isolation**: Database is not directly accessible from the internet

## Prerequisites

1. **Docker and Docker Compose** installed
2. **Domain name** pointing to your server
3. **Ports 80 and 443** open in firewall
4. **Valid email address** for Let's Encrypt notifications

## Quick Setup

### 1. Run Setup Script

```bash
# Linux/macOS
./scripts/setup-traefik.sh

# Windows PowerShell
.\scripts\setup-traefik.ps1
```

### 2. Configure Environment

Edit `.env.production`:

```bash
# Domain Configuration
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Database Configuration
DB_NAME=gestaosub
DB_USER=gestaosub_user
DB_PASSWORD=your-secure-password

# Security Configuration
CORS_ORIGIN=https://yourdomain.com
```

### 3. Update Secrets

Generate secure secrets:

```bash
# Database password
openssl rand -base64 32 > secrets/db_password.txt

# JWT secret
openssl rand -base64 64 > secrets/jwt_secret.txt

# Cookie secret
openssl rand -base64 32 > secrets/cookie_secret.txt
```

### 4. Deploy Services

```bash
# Start Traefik first
docker-compose up -d traefik

# Wait for Traefik to be ready, then start other services
docker-compose up -d
```

### 5. Verify Setup

```bash
# Run validation script
./scripts/validate-traefik.sh

# Check service status
docker-compose ps

# Check logs
docker-compose logs traefik
```

## Configuration Details

### Traefik Static Configuration (`traefik/traefik.yml`)

Key features:
- **Entry Points**: HTTP (80) and HTTPS (443)
- **Certificate Resolvers**: Production and staging Let's Encrypt
- **Providers**: Docker and file-based configuration
- **Logging**: JSON format with access logs
- **Metrics**: Prometheus metrics enabled

### Dynamic Configuration (`traefik/dynamic/`)

#### Middlewares (`middlewares.yml`)
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: Multiple tiers (general, API, strict)
- **Compression**: Gzip compression for responses
- **CORS**: Cross-origin resource sharing
- **Authentication**: Basic auth for admin areas

#### Routers (`routers.yml`)
- **Main Application**: Routes to GestãoSub app
- **Dashboard**: Admin access to Traefik dashboard
- **API Routes**: Special handling for API endpoints
- **Static Assets**: Optimized caching for static files

#### TLS Configuration (`tls.yml`)
- **Modern TLS**: TLS 1.2+ with secure cipher suites
- **ALPN**: HTTP/2 and HTTP/1.1 support
- **Curve Preferences**: Modern elliptic curves

#### Monitoring (`monitoring.yml`)
- **Metrics Endpoint**: Prometheus metrics
- **Health Checks**: Ping endpoint for monitoring

### Docker Compose Integration

The application is configured with Traefik labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.gestaosub.rule=Host(`${DOMAIN}`)"
  - "traefik.http.routers.gestaosub.entrypoints=websecure"
  - "traefik.http.routers.gestaosub.tls.certresolver=letsencrypt"
  - "traefik.http.routers.gestaosub.middlewares=public-chain@file"
```

## Security Features

### 1. SSL/TLS Security

- **Automatic Certificates**: Let's Encrypt with HTTP challenge
- **Strong Ciphers**: TLS 1.2+ with modern cipher suites
- **HSTS**: HTTP Strict Transport Security enabled
- **Certificate Monitoring**: Automatic renewal

### 2. Security Headers

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

### 3. Rate Limiting

- **General**: 100 requests/minute, burst 50
- **API**: 30 requests/minute, burst 10
- **Strict**: 10 requests/minute, burst 5
- **Upload**: 5 requests/minute, burst 2

### 4. Access Control

- **Admin Dashboard**: Basic authentication required
- **IP Whitelisting**: Optional for admin areas
- **CORS**: Restricted to configured origins

## Monitoring and Maintenance

### Health Checks

```bash
# Application health
curl https://yourdomain.com/health

# Traefik health
curl https://traefik.yourdomain.com/ping

# Service status
docker-compose ps
```

### Log Monitoring

```bash
# Traefik logs
docker-compose logs traefik --tail=100

# Application logs
docker-compose logs app --tail=100

# Access logs
docker exec traefik tail -f /var/log/traefik/access.log
```

### Certificate Management

```bash
# Check certificate status
docker exec traefik ls -la /certs/

# View certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com | openssl x509 -noout -text

# Force certificate renewal (if needed)
docker exec traefik rm /certs/acme.json
docker-compose restart traefik
```

### Backup Procedures

```bash
# Backup certificates
docker cp traefik:/certs ./backup_certs_$(date +%Y%m%d)

# Backup configuration
tar -czf traefik_config_$(date +%Y%m%d).tar.gz traefik/ secrets/ .env.production

# Backup database
docker exec db pg_dump -U gestaosub_user gestaosub > db_backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Application not responding
   - Check application logs: `docker-compose logs app`
   - Verify health endpoint: `docker exec app curl http://localhost:3000/health`

2. **SSL Certificate Issues**: Let's Encrypt problems
   - Check rate limits (5 certificates per domain per week)
   - Use staging resolver for testing
   - Verify DNS points to your server

3. **Dashboard Not Accessible**: Authentication or routing issues
   - Check admin credentials in middlewares.yml
   - Verify traefik.yourdomain.com DNS resolution

4. **Rate Limiting Too Aggressive**: Legitimate users blocked
   - Adjust rate limits in middlewares.yml
   - Add trusted IPs to exclusion list

### Debug Commands

```bash
# Validate configuration
./scripts/validate-traefik.sh

# Check Traefik configuration
docker exec traefik traefik validate --configfile=/etc/traefik/traefik.yml

# Test internal connectivity
docker exec app nc -z db 5432
docker exec traefik nc -z app 3000

# View Traefik API data
docker exec traefik wget -q -O - http://localhost:8080/api/rawdata
```

## Performance Optimization

### 1. Connection Pooling

```yaml
# In traefik.yml
serversTransport:
  maxIdleConnsPerHost: 100
  forwardingTimeouts:
    dialTimeout: 10s
    responseHeaderTimeout: 30s
```

### 2. Compression

```yaml
# In middlewares.yml
compression:
  compress:
    minResponseBodyBytes: 1024
```

### 3. Caching Headers

```yaml
# For static assets
cache-headers:
  headers:
    customResponseHeaders:
      Cache-Control: "public, max-age=31536000"
```

## Advanced Configuration

### Custom Middleware

Add custom middleware in `traefik/dynamic/middlewares.yml`:

```yaml
custom-middleware:
  headers:
    customRequestHeaders:
      X-Custom-Header: "value"
```

### Multiple Domains

Add additional routers for multiple domains:

```yaml
app-secondary:
  rule: "Host(`secondary.domain.com`)"
  entryPoints:
    - websecure
  service: gestaosub@docker
  tls:
    certResolver: letsencrypt
```

### External Services

Route to external services:

```yaml
external-service:
  rule: "Host(`api.yourdomain.com`)"
  service: external-api
  
services:
  external-api:
    loadBalancer:
      servers:
        - url: "http://external-server:8080"
```

## Security Best Practices

1. **Regular Updates**: Keep Traefik and base images updated
2. **Secret Rotation**: Regularly rotate passwords and secrets
3. **Access Logs**: Monitor for suspicious activity
4. **Firewall Rules**: Restrict access to necessary ports only
5. **Backup Strategy**: Regular backups of certificates and configuration
6. **Monitoring**: Set up alerts for certificate expiry and service health

## Support and Resources

- **Traefik Documentation**: https://doc.traefik.io/traefik/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Docker Compose**: https://docs.docker.com/compose/
- **Troubleshooting Guide**: `docs/traefik-troubleshooting.md`

For issues specific to this setup, check the troubleshooting guide or review the configuration files in the `traefik/` directory.