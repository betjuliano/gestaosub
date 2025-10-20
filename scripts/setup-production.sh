#!/bin/bash

# Production Setup Script for GestãoSub
set -e

echo "🚀 Setting up GestãoSub for production deployment..."

# Create external network if it doesn't exist
echo "📡 Creating external network 'web'..."
docker network create web 2>/dev/null || echo "Network 'web' already exists"

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p traefik/dynamic
mkdir -p secrets
mkdir -p backups
mkdir -p logs

# Set proper permissions for secrets
echo "🔒 Setting secure permissions for secrets directory..."
chmod 700 secrets
chmod 600 secrets/*.txt

# Create acme.json file for Let's Encrypt certificates
echo "📜 Creating acme.json for SSL certificates..."
touch traefik/acme.json
chmod 600 traefik/acme.json

# Generate secure secrets if they don't exist
echo "🔐 Generating secure secrets..."

if [ ! -f secrets/db_password.txt ] || [ "$(cat secrets/db_password.txt)" = "your-secure-database-password-here" ]; then
    echo "Generating database password..."
    openssl rand -base64 32 > secrets/db_password.txt
fi

if [ ! -f secrets/jwt_secret.txt ] || [ "$(cat secrets/jwt_secret.txt)" = "your-super-secure-jwt-secret-key-minimum-32-characters-long" ]; then
    echo "Generating JWT secret..."
    openssl rand -base64 64 > secrets/jwt_secret.txt
fi

if [ ! -f secrets/cookie_secret.txt ] || [ "$(cat secrets/cookie_secret.txt)" = "your-secure-cookie-secret-key-for-session-encryption" ]; then
    echo "Generating cookie secret..."
    openssl rand -base64 32 > secrets/cookie_secret.txt
fi

# Set proper permissions again after generating secrets
chmod 600 secrets/*.txt

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  Creating .env.production from template..."
    cp .env.production.template .env.production
    echo "📝 Please edit .env.production with your actual configuration values"
fi

# Validate Docker and Docker Compose
echo "🐳 Validating Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Test Docker daemon
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running. Please start Docker first."
    exit 1
fi

echo "✅ Production environment setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env.production with your actual configuration values"
echo "2. Update secrets files in ./secrets/ directory if needed"
echo "3. Run 'docker-compose up -d' to start the services"
echo "4. Check logs with 'docker-compose logs -f'"
echo ""
echo "Important files to configure:"
echo "- .env.production (domain, email, database settings)"
echo "- secrets/db_password.txt (database password)"
echo "- secrets/jwt_secret.txt (JWT signing key)"
echo "- secrets/cookie_secret.txt (session encryption key)"