# GestãoSub - Production Docker Setup

This document describes the production Docker configuration for GestãoSub, including PostgreSQL database, Traefik proxy, and comprehensive security settings.

## Architecture Overview

The production setup includes:

- **Traefik**: Reverse proxy with automatic SSL certificates
- **PostgreSQL**: Database with persistent storage
- **GestãoSub App**: Main application container
- **Networks**: Isolated internal network for security
- **Secrets**: Secure management of sensitive data

## Quick Start

### 1. Initial Setup

Run the setup script to initialize the production environment:

```bash
# Linux/macOS
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh

# Windows (PowerShell)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-production.ps1
```

### 2. Configure Environment

Edit the `.env.production` file with your actual values:

```bash
# Required configuration
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com
DB_PASSWORD=your-secure-database-password
```

### 3. Deploy to Production

```bash
# Create external network (if not already created)
docker network create web

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## Configuration Files

### Docker Compose Files

- `docker-compose.yml`: Base configuration with all services
- `docker-compose.prod.yml`: Production-specific overrides
- `docker-compose.override.yml`: Development overrides (auto-loaded)

### Traefik Configuration

- `traefik/traefik.yml`: Main Traefik configuration
- `traefik/dynamic/tls.yml`: TLS/SSL settings
- `traefik/dynamic/middlewares.yml`: Security middlewares

### Environment Files

- `.env.production.template`: Template for production environment
- `.env.production`: Actual production configuration (create from template)

### Secrets

- `secrets/db_password.txt`: Database password
- `secrets/jwt_secret.txt`: JWT signing key
- `secrets/cookie_secret.txt`: Session encryption key

## Network Configuration

### External Network (web)

```bash
# Create the external network
docker network create web
```

This network allows Traefik to communicate with other services and should be created before starting the stack.

### Internal Network

The `internal` network is automatically created and provides isolated communication between the app and database.

## Security Features

### SSL/TLS Configuration

- Automatic SSL certificates via Let's Encrypt
- TLS 1.2+ only with secure cipher suites
- HSTS headers with preload
- Automatic HTTP to HTTPS redirection

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy for camera, microphone, etc.

### Rate Limiting

- Global rate limiting: 100 requests/minute
- API rate limiting: 30 requests/minute
- Burst protection: 50 requests

### Access Control

- CORS configured for specific domains
- IP whitelisting for admin areas (optional)
- Basic authentication for Traefik dashboard

## Database Configuration

### PostgreSQL Optimization

Production database is configured with optimized settings:

- Connection pooling (200 max connections)
- Shared buffers: 256MB
- Effective cache size: 1GB
- WAL optimization for performance

### Backup Strategy

```bash
# Manual backup
docker-compose exec db pg_dump -U gestaosub_user gestaosub > backup.sql

# Automated backup (add to cron)
docker-compose exec db pg_dump -U gestaosub_user gestaosub | gzip > backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

## Monitoring and Logging

### Health Checks

All services include health checks:

- **App**: HTTP endpoint `/health`
- **Database**: PostgreSQL connection test
- **Traefik**: Built-in health monitoring

### Logging Configuration

- Structured JSON logging
- Log rotation and retention
- Access logs with privacy protection
- Error tracking and alerting

### Metrics (Optional)

Prometheus metrics are available at `/metrics` endpoint when enabled.

## Deployment Commands

### Development

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production

```bash
# Deploy to production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Update application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull app
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d app

# Scale application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3
```

### Maintenance

```bash
# View service status
docker-compose ps

# Check logs
docker-compose logs -f [service_name]

# Execute commands in containers
docker-compose exec app npm run db:migrate
docker-compose exec db psql -U gestaosub_user gestaosub

# Backup database
docker-compose exec db pg_dump -U gestaosub_user gestaosub > backup.sql

# Restart services
docker-compose restart [service_name]
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   docker-compose logs traefik | grep -i acme
   
   # Verify domain DNS
   nslookup your-domain.com
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs db
   
   # Test connection
   docker-compose exec app npm run db:test
   ```

3. **Application Errors**
   ```bash
   # Check application logs
   docker-compose logs app
   
   # Check health endpoint
   curl -f http://localhost:3000/health
   ```

### Performance Optimization

1. **Database Performance**
   - Monitor connection pool usage
   - Optimize queries and indexes
   - Regular VACUUM and ANALYZE

2. **Application Performance**
   - Monitor memory usage
   - Enable compression middleware
   - Optimize static asset delivery

3. **Network Performance**
   - Use CDN for static assets
   - Enable HTTP/2 and compression
   - Monitor response times

## Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS with strong ciphers
- [ ] Set up rate limiting
- [ ] Configure security headers
- [ ] Enable access logging
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup and recovery testing

## Backup and Recovery

### Automated Backups

Create a backup script and add to cron:

```bash
#!/bin/bash
# backup-script.sh
DATE=$(date +%Y%m%d-%H%M%S)
docker-compose exec -T db pg_dump -U gestaosub_user gestaosub | gzip > backups/backup-$DATE.sql.gz

# Keep only last 30 days
find backups/ -name "backup-*.sql.gz" -mtime +30 -delete
```

### Recovery Process

```bash
# Stop application
docker-compose stop app

# Restore database
gunzip -c backups/backup-YYYYMMDD-HHMMSS.sql.gz | docker-compose exec -T db psql -U gestaosub_user gestaosub

# Start application
docker-compose start app
```

## Support

For issues and questions:

1. Check the logs: `docker-compose logs -f`
2. Verify configuration files
3. Check network connectivity
4. Review security settings
5. Consult the troubleshooting section

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)