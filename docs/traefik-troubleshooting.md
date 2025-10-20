# Traefik Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Traefik proxy configuration in the GestãoSub production deployment.

## Quick Diagnostics

### 1. Check Service Status

```bash
# Check if all services are running
docker-compose ps

# Check Traefik logs
docker-compose logs traefik

# Check application logs
docker-compose logs app

# Check database logs
docker-compose logs db
```

### 2. Validate Configuration

```bash
# Run the validation script
./scripts/validate-traefik.sh

# Test Docker Compose configuration
docker-compose config

# Check Traefik configuration syntax
docker exec traefik traefik validate --configfile=/etc/traefik/traefik.yml
```

## Common Issues and Solutions

### Issue 1: "Gateway Timeout" or "Service Unavailable"

**Symptoms:**
- 502 Bad Gateway errors
- 503 Service Unavailable errors
- Traefik dashboard shows service as unhealthy

**Diagnosis:**
```bash
# Check if application container is running
docker ps | grep gestaosub-app

# Check application health endpoint
docker exec gestaosub-app curl -f http://localhost:3000/health

# Check application logs for errors
docker-compose logs app --tail=50
```

**Solutions:**
1. **Application not starting:**
   ```bash
   # Check environment variables
   docker exec gestaosub-app env | grep -E "(DATABASE_URL|NODE_ENV|PORT)"
   
   # Restart application
   docker-compose restart app
   ```

2. **Database connection issues:**
   ```bash
   # Check database connectivity
   docker exec gestaosub-app nc -z db 5432
   
   # Check database logs
   docker-compose logs db --tail=20
   ```

3. **Health check failing:**
   ```bash
   # Check health endpoint manually
   docker exec gestaosub-app curl -v http://localhost:3000/health
   
   # Verify health check configuration in docker-compose.yml
   ```

### Issue 2: SSL Certificate Problems

**Symptoms:**
- "Your connection is not private" browser warnings
- Certificate errors in logs
- HTTP works but HTTPS doesn't

**Diagnosis:**
```bash
# Check certificate status
docker exec traefik ls -la /certs/

# Check ACME logs
docker-compose logs traefik | grep -i acme

# Test SSL connection
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

**Solutions:**
1. **Let's Encrypt rate limiting:**
   ```bash
   # Switch to staging resolver temporarily
   # Edit traefik/traefik.yml and change certResolver to letsencrypt-staging
   
   # Clear existing certificates
   docker-compose down
   docker volume rm gestaosub_traefik-certs
   docker-compose up -d
   ```

2. **DNS not pointing to server:**
   ```bash
   # Verify DNS resolution
   nslookup yourdomain.com
   dig yourdomain.com A
   
   # Check if domain points to your server IP
   ```

3. **Firewall blocking ports:**
   ```bash
   # Check if ports 80 and 443 are open
   sudo ufw status
   sudo iptables -L
   
   # Open required ports
   sudo ufw allow 80
   sudo ufw allow 443
   ```

### Issue 3: Traefik Dashboard Not Accessible

**Symptoms:**
- Cannot access traefik.yourdomain.com
- 404 errors on dashboard routes
- Authentication failures

**Diagnosis:**
```bash
# Check dashboard configuration
docker exec traefik cat /etc/traefik/traefik.yml | grep -A 5 api:

# Check dashboard router
docker exec traefik cat /etc/traefik/dynamic/routers.yml | grep -A 10 dashboard:

# Test internal API access
docker exec traefik wget -q -O - http://localhost:8080/api/rawdata
```

**Solutions:**
1. **Authentication issues:**
   ```bash
   # Generate new admin password hash
   htpasswd -nb admin your-new-password
   
   # Update middlewares.yml with new hash
   # Restart Traefik
   docker-compose restart traefik
   ```

2. **Router configuration:**
   ```bash
   # Verify dashboard router in dynamic/routers.yml
   # Ensure rule matches: Host(`traefik.${DOMAIN}`)
   # Check middleware chain: admin-chain@file
   ```

### Issue 4: Rate Limiting Too Aggressive

**Symptoms:**
- "Too Many Requests" (429) errors
- Legitimate users being blocked
- API calls failing frequently

**Diagnosis:**
```bash
# Check rate limiting logs
docker-compose logs traefik | grep -i "rate limit"

# Check current rate limit configuration
docker exec traefik cat /etc/traefik/dynamic/middlewares.yml | grep -A 10 rate-limit:
```

**Solutions:**
1. **Adjust rate limits:**
   ```yaml
   # Edit traefik/dynamic/middlewares.yml
   rate-limit:
     rateLimit:
       average: 200  # Increase from 100
       period: "1m"
       burst: 100    # Increase from 50
   ```

2. **Exclude trusted IPs:**
   ```yaml
   # Add to rate-limit middleware
   sourceCriterion:
     ipStrategy:
       excludedIPs:
         - "your.trusted.ip/32"
   ```

### Issue 5: Database Connection Issues

**Symptoms:**
- Application fails to start
- Database connection timeouts
- Migration errors

**Diagnosis:**
```bash
# Check database container status
docker-compose ps db

# Test database connectivity
docker exec gestaosub-app nc -z db 5432

# Check database logs
docker-compose logs db --tail=30

# Test database connection with credentials
docker exec db psql -U gestaosub_user -d gestaosub -c "SELECT 1;"
```

**Solutions:**
1. **Database not ready:**
   ```bash
   # Wait for database to be ready
   docker-compose up db
   # Wait for "database system is ready to accept connections"
   
   # Then start application
   docker-compose up app
   ```

2. **Connection string issues:**
   ```bash
   # Verify DATABASE_URL format
   # Should be: postgresql://user:password@db:5432/database?sslmode=prefer
   
   # Check secrets are properly mounted
   docker exec gestaosub-app cat /run/secrets/jwt_secret
   ```

3. **Network connectivity:**
   ```bash
   # Check internal network
   docker network ls | grep internal
   
   # Verify containers are on same network
   docker inspect gestaosub-app | grep NetworkMode
   docker inspect gestaosub-db | grep NetworkMode
   ```

## Performance Optimization

### 1. Monitor Resource Usage

```bash
# Check container resource usage
docker stats

# Check system resources
htop
df -h
free -h
```

### 2. Optimize Traefik Configuration

```yaml
# Add to traefik.yml for better performance
serversTransport:
  maxIdleConnsPerHost: 100
  forwardingTimeouts:
    dialTimeout: 10s
    responseHeaderTimeout: 30s
    idleConnTimeout: 90s

# Enable compression
entryPoints:
  websecure:
    http:
      middlewares:
        - compression@file
```

### 3. Database Performance

```bash
# Monitor database performance
docker exec db pg_stat_activity

# Check slow queries
docker exec db psql -U gestaosub_user -d gestaosub -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"
```

## Security Hardening

### 1. Update Default Passwords

```bash
# Generate new database password
openssl rand -base64 32 > secrets/db_password.txt

# Generate new JWT secret
openssl rand -base64 64 > secrets/jwt_secret.txt

# Generate new cookie secret
openssl rand -base64 32 > secrets/cookie_secret.txt

# Restart services
docker-compose restart
```

### 2. Review Security Headers

```bash
# Test security headers
curl -I https://yourdomain.com

# Should include:
# Strict-Transport-Security
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### 3. Monitor Access Logs

```bash
# Check access logs for suspicious activity
docker exec traefik tail -f /var/log/traefik/access.log

# Look for:
# - High frequency requests from single IP
# - 4xx/5xx error patterns
# - Unusual user agents
```

## Backup and Recovery

### 1. Backup Critical Data

```bash
# Backup database
docker exec db pg_dump -U gestaosub_user gestaosub > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup certificates
docker cp traefik:/certs ./backup_certs_$(date +%Y%m%d)

# Backup configuration
tar -czf config_backup_$(date +%Y%m%d).tar.gz traefik/ secrets/ .env.production
```

### 2. Recovery Procedures

```bash
# Restore database
docker exec -i db psql -U gestaosub_user gestaosub < backup_file.sql

# Restore certificates
docker cp ./backup_certs/ traefik:/certs/

# Restart services after restore
docker-compose restart
```

## Monitoring and Alerting

### 1. Health Monitoring

```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
# Check service health
if ! curl -f https://yourdomain.com/health > /dev/null 2>&1; then
    echo "Application health check failed" | mail -s "Alert: Service Down" admin@yourdomain.com
fi

# Check certificate expiry
DAYS=$(echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2 | xargs -I {} date -d {} +%s | xargs -I {} expr \( {} - $(date +%s) \) / 86400)
if [ $DAYS -lt 30 ]; then
    echo "SSL certificate expires in $DAYS days" | mail -s "Alert: Certificate Expiry" admin@yourdomain.com
fi
EOF

# Add to crontab
crontab -e
# Add: */5 * * * * /path/to/monitor.sh
```

### 2. Log Analysis

```bash
# Analyze error patterns
docker-compose logs traefik | grep -E "(error|ERROR)" | tail -20

# Check response times
docker-compose logs traefik | grep -o '"duration":[0-9]*' | sort -n | tail -10

# Monitor rate limiting
docker-compose logs traefik | grep -c "rate limit"
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs:** Always start with `docker-compose logs`
2. **Verify configuration:** Run `./scripts/validate-traefik.sh`
3. **Test connectivity:** Use `curl`, `nc`, and `ping` to test network connectivity
4. **Check resources:** Ensure adequate CPU, memory, and disk space
5. **Review documentation:** Check Traefik official documentation for advanced configuration

For additional support, provide the following information:
- Output of `docker-compose ps`
- Relevant log entries from `docker-compose logs`
- Your domain configuration (without sensitive data)
- Steps to reproduce the issue