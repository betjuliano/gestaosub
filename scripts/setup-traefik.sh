#!/bin/bash

# Traefik Setup Script for Production Deployment
# This script sets up the necessary Docker networks and directories for Traefik

set -e

echo "🚀 Setting up Traefik for production deployment..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running ✓"

# Create external web network if it doesn't exist
if ! docker network ls | grep -q "web"; then
    print_status "Creating external 'web' network for Traefik..."
    docker network create web
    print_success "External 'web' network created"
else
    print_warning "External 'web' network already exists"
fi

# Create necessary directories
print_status "Creating necessary directories..."

# Create certificates directory with proper permissions
if [ ! -d "./certs" ]; then
    mkdir -p ./certs
    chmod 600 ./certs
    print_success "Created certificates directory"
else
    print_warning "Certificates directory already exists"
fi

# Create logs directory
if [ ! -d "./logs/traefik" ]; then
    mkdir -p ./logs/traefik
    print_success "Created Traefik logs directory"
else
    print_warning "Traefik logs directory already exists"
fi

# Create backups directory
if [ ! -d "./backups" ]; then
    mkdir -p ./backups
    chmod 700 ./backups
    print_success "Created backups directory"
else
    print_warning "Backups directory already exists"
fi

# Verify secrets directory and files
print_status "Verifying secrets configuration..."

if [ ! -d "./secrets" ]; then
    mkdir -p ./secrets
    chmod 700 ./secrets
    print_success "Created secrets directory"
fi

# Check required secret files
REQUIRED_SECRETS=("db_password.txt" "jwt_secret.txt" "cookie_secret.txt")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ ! -f "./secrets/$secret" ]; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    print_warning "Missing secret files: ${MISSING_SECRETS[*]}"
    print_status "Creating placeholder secret files (CHANGE THESE IN PRODUCTION!)..."
    
    for secret in "${MISSING_SECRETS[@]}"; do
        case $secret in
            "db_password.txt")
                echo "change-this-secure-db-password-$(date +%s)" > "./secrets/$secret"
                ;;
            "jwt_secret.txt")
                openssl rand -base64 64 > "./secrets/$secret"
                ;;
            "cookie_secret.txt")
                openssl rand -base64 32 > "./secrets/$secret"
                ;;
        esac
        chmod 600 "./secrets/$secret"
        print_success "Created $secret"
    done
    
    print_warning "⚠️  IMPORTANT: Update the generated secrets with secure values before production deployment!"
else
    print_success "All required secret files exist"
fi

# Verify environment configuration
print_status "Verifying environment configuration..."

if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.template" ]; then
        print_warning ".env.production not found, copying from template..."
        cp .env.production.template .env.production
        print_success "Created .env.production from template"
        print_warning "⚠️  IMPORTANT: Update .env.production with your actual domain and configuration!"
    else
        print_error ".env.production.template not found. Cannot create environment file."
        exit 1
    fi
else
    print_success "Environment configuration exists"
fi

# Validate Traefik configuration files
print_status "Validating Traefik configuration..."

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
done

print_success "All Traefik configuration files exist"

# Test Traefik configuration syntax (if traefik command is available)
if command -v traefik > /dev/null 2>&1; then
    print_status "Testing Traefik configuration syntax..."
    if traefik validate --configfile=traefik/traefik.yml; then
        print_success "Traefik configuration is valid"
    else
        print_error "Traefik configuration has syntax errors"
        exit 1
    fi
else
    print_warning "Traefik command not available, skipping syntax validation"
fi

# Set proper file permissions
print_status "Setting proper file permissions..."
chmod 644 traefik/*.yml
chmod 644 traefik/dynamic/*.yml
chmod 600 secrets/*
chmod 700 secrets/
print_success "File permissions set correctly"

# Final summary
echo ""
print_success "🎉 Traefik setup completed successfully!"
echo ""
print_status "Next steps:"
echo "  1. Update .env.production with your actual domain and email"
echo "  2. Update secrets in ./secrets/ directory with secure values"
echo "  3. Run: docker-compose up -d traefik"
echo "  4. Verify Traefik dashboard at: https://traefik.yourdomain.com"
echo ""
print_warning "⚠️  Security reminders:"
echo "  - Change all default passwords and secrets"
echo "  - Verify firewall rules (ports 80, 443)"
echo "  - Test SSL certificate generation"
echo "  - Configure monitoring and alerting"
echo ""