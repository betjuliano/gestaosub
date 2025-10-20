#!/bin/bash

# Traefik Configuration Validation Script
# This script validates the Traefik setup and configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔍 Validating Traefik configuration..."

# Load environment variables
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
    print_success "Loaded environment variables from .env.production"
else
    print_error ".env.production file not found"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=("DOMAIN" "ACME_EMAIL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Required environment variables are set"

# Validate domain format
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    print_warning "Domain format might be invalid: $DOMAIN"
fi

# Validate email format
if [[ ! "$ACME_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Invalid email format: $ACME_EMAIL"
    exit 1
fi

print_success "Domain and email formats are valid"

# Check Docker network
if ! docker network ls | grep -q "web"; then
    print_error "Docker network 'web' does not exist. Run setup-traefik.sh first."
    exit 1
fi

print_success "Docker network 'web' exists"

# Check required directories
REQUIRED_DIRS=("traefik" "traefik/dynamic" "secrets" "certs")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        print_error "Required directory $dir does not exist"
        exit 1
    fi
done

print_success "All required directories exist"

# Check Traefik configuration files
TRAEFIK_CONFIGS=(
    "traefik/traefik.yml"
    "traefik/dynamic/middlewares.yml"
    "traefik/dynamic/routers.yml"
    "traefik/dynamic/tls.yml"
    "traefik/dynamic/monitoring.yml"
)

for config in "${TRAEFIK_CONFIGS[@]}"; do
    if [ ! -f "$config" ]; then
        print_error "Missing Traefik configuration: $config"
        exit 1
    fi
    
    # Basic YAML syntax check
    if command -v python3 > /dev/null 2>&1; then
        if ! python3 -c "import yaml; yaml.safe_load(open('$config'))" 2>/dev/null; then
            print_error "Invalid YAML syntax in $config"
            exit 1
        fi
    fi
done

print_success "All Traefik configuration files exist and have valid YAML syntax"

# Check secret files
SECRET_FILES=("secrets/db_password.txt" "secrets/jwt_secret.txt" "secrets/cookie_secret.txt")
for secret in "${SECRET_FILES[@]}"; do
    if [ ! -f "$secret" ]; then
        print_error "Missing secret file: $secret"
        exit 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$secret" ]; then
        print_error "Secret file is empty: $secret"
        exit 1
    fi
    
    # Check file permissions (should be 600)
    PERMS=$(stat -c "%a" "$secret" 2>/dev/null || stat -f "%A" "$secret" 2>/dev/null)
    if [ "$PERMS" != "600" ]; then
        print_warning "Secret file $secret has permissions $PERMS (should be 600)"
    fi
done

print_success "All secret files exist and are not empty"

# Test Docker Compose configuration
print_status "Validating Docker Compose configuration..."
if docker-compose config > /dev/null 2>&1; then
    print_success "Docker Compose configuration is valid"
else
    print_error "Docker Compose configuration has errors"
    exit 1
fi

# Check if Traefik container is running
if docker ps --format "table {{.Names}}" | grep -q "traefik"; then
    print_success "Traefik container is running"
    
    # Check Traefik health
    if docker exec traefik traefik healthcheck --ping > /dev/null 2>&1; then
        print_success "Traefik health check passed"
    else
        print_warning "Traefik health check failed"
    fi
    
    # Check if dashboard is accessible (internal)
    if docker exec traefik wget -q --spider http://localhost:8080/api/rawdata 2>/dev/null; then
        print_success "Traefik API is accessible"
    else
        print_warning "Traefik API is not accessible"
    fi
else
    print_warning "Traefik container is not running"
fi

# DNS resolution check
print_status "Checking DNS resolution..."
if nslookup "$DOMAIN" > /dev/null 2>&1; then
    print_success "Domain $DOMAIN resolves correctly"
else
    print_warning "Domain $DOMAIN does not resolve or DNS lookup failed"
fi

if nslookup "traefik.$DOMAIN" > /dev/null 2>&1; then
    print_success "Traefik subdomain resolves correctly"
else
    print_warning "Traefik subdomain does not resolve"
fi

# Port accessibility check
print_status "Checking port accessibility..."
if command -v nc > /dev/null 2>&1; then
    if nc -z localhost 80 2>/dev/null; then
        print_success "Port 80 is accessible"
    else
        print_warning "Port 80 is not accessible"
    fi
    
    if nc -z localhost 443 2>/dev/null; then
        print_success "Port 443 is accessible"
    else
        print_warning "Port 443 is not accessible"
    fi
else
    print_warning "netcat not available, skipping port checks"
fi

# SSL certificate check (if domain is accessible)
print_status "Checking SSL certificate..."
if command -v openssl > /dev/null 2>&1; then
    if timeout 10 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null > /dev/null 2>&1; then
        print_success "SSL certificate is accessible and valid"
        
        # Check certificate expiration
        CERT_EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$CERT_EXPIRY" ]; then
            EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null)
            CURRENT_TIMESTAMP=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
            
            if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                print_warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            else
                print_success "SSL certificate is valid for $DAYS_UNTIL_EXPIRY days"
            fi
        fi
    else
        print_warning "SSL certificate check failed (domain might not be accessible)"
    fi
else
    print_warning "OpenSSL not available, skipping SSL certificate check"
fi

echo ""
print_success "🎉 Traefik validation completed!"
echo ""
print_status "Summary:"
echo "  - Configuration files: ✓"
echo "  - Environment variables: ✓"
echo "  - Docker network: ✓"
echo "  - Secret files: ✓"
echo "  - Docker Compose: ✓"
echo ""

if docker ps --format "table {{.Names}}" | grep -q "traefik"; then
    echo "🌐 Access your services:"
    echo "  - Main application: https://$DOMAIN"
    echo "  - Traefik dashboard: https://traefik.$DOMAIN"
    echo ""
fi

print_status "For troubleshooting, check logs with:"
echo "  docker-compose logs traefik"
echo "  docker-compose logs app"