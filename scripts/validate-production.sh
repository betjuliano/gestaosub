#!/bin/bash

# Production Configuration Validation Script
set -e

echo "🔍 Validating production configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation functions
validate_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1 exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 is missing${NC}"
        return 1
    fi
}

validate_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ Directory $1 exists${NC}"
        return 0
    else
        echo -e "${RED}❌ Directory $1 is missing${NC}"
        return 1
    fi
}

validate_secret() {
    if [ -f "$1" ] && [ -s "$1" ]; then
        local content=$(cat "$1")
        if [[ "$content" != *"your-"* ]] && [[ "$content" != *"change-this"* ]]; then
            echo -e "${GREEN}✅ $1 has been configured${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  $1 contains default values${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ $1 is missing or empty${NC}"
        return 1
    fi
}

# Start validation
echo "Checking required files and directories..."

# Check Docker Compose files
validate_file "docker-compose.yml"
validate_file "docker-compose.prod.yml"
validate_file "docker-compose.override.yml"

# Check Traefik configuration
validate_directory "traefik"
validate_file "traefik/traefik.yml"
validate_file "traefik/dynamic/tls.yml"
validate_file "traefik/dynamic/middlewares.yml"

# Check secrets
validate_directory "secrets"
validate_secret "secrets/db_password.txt"
validate_secret "secrets/jwt_secret.txt"
validate_secret "secrets/cookie_secret.txt"

# Check environment file
if validate_file ".env.production"; then
    # Check if critical environment variables are set
    source .env.production 2>/dev/null || true
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "gestaodeartigos.iaprojetos.com.br" ]; then
        echo -e "${YELLOW}⚠️  DOMAIN not configured in .env.production${NC}"
    else
        echo -e "${GREEN}✅ DOMAIN configured: $DOMAIN${NC}"
    fi
    
    if [ -z "$ACME_EMAIL" ] || [ "$ACME_EMAIL" = "admin@iaprojetos.com.br" ]; then
        echo -e "${YELLOW}⚠️  ACME_EMAIL not configured in .env.production${NC}"
    else
        echo -e "${GREEN}✅ ACME_EMAIL configured: $ACME_EMAIL${NC}"
    fi
fi

# Check Docker
echo ""
echo "Checking Docker environment..."

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is installed${NC}"
    
    if docker info &> /dev/null; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
    else
        echo -e "${RED}❌ Docker daemon is not running${NC}"
    fi
else
    echo -e "${RED}❌ Docker is not installed${NC}"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker Compose is available${NC}"
else
    echo -e "${RED}❌ Docker Compose is not available${NC}"
fi

# Check external network
if docker network ls | grep -q "web"; then
    echo -e "${GREEN}✅ External network 'web' exists${NC}"
else
    echo -e "${YELLOW}⚠️  External network 'web' does not exist${NC}"
    echo "   Run: docker network create web"
fi

# Check Dockerfile
if validate_file "Dockerfile"; then
    echo -e "${GREEN}✅ Dockerfile exists${NC}"
fi

echo ""
echo "🔍 Validation complete!"
echo ""
echo "Next steps if validation passed:"
echo "1. Review and update .env.production with your values"
echo "2. Update secrets files if needed"
echo "3. Create external network: docker network create web"
echo "4. Deploy: docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"