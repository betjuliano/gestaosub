#!/bin/bash

# Generate Docker secrets for production deployment
# This script creates secure random secrets for all required services

set -e

SECRETS_DIR="./secrets"
BACKUP_DIR="./secrets/backup-$(date +%Y%m%d-%H%M%S)"

echo "🔐 Generating Docker secrets for GestãoSub production deployment..."

# Create secrets directory if it doesn't exist
mkdir -p "$SECRETS_DIR"

# Backup existing secrets if they exist
if [ "$(ls -A $SECRETS_DIR/*.txt 2>/dev/null)" ]; then
    echo "📦 Backing up existing secrets to $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp "$SECRETS_DIR"/*.txt "$BACKUP_DIR/" 2>/dev/null || true
fi

# Function to generate a secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to create secret file
create_secret() {
    local name=$1
    local value=$2
    local file="$SECRETS_DIR/${name}.txt"
    
    echo "$value" > "$file"
    chmod 600 "$file"
    echo "✅ Created secret: $name"
}

# Function to prompt for secret value
prompt_secret() {
    local name=$1
    local description=$2
    local file="$SECRETS_DIR/${name}.txt"
    
    if [ -f "$file" ]; then
        echo "⚠️  Secret $name already exists. Skipping..."
        return
    fi
    
    echo "📝 Enter $description (leave empty to skip):"
    read -s value
    
    if [ -n "$value" ]; then
        create_secret "$name" "$value"
    else
        echo "⏭️  Skipped: $name"
    fi
}

echo ""
echo "🔑 Generating application secrets..."

# Generate required application secrets
create_secret "jwt_secret" "$(generate_secret)"
create_secret "cookie_secret" "$(generate_secret)"

echo ""
echo "🗄️  Database configuration..."

# Database password
if [ ! -f "$SECRETS_DIR/db_password.txt" ]; then
    DB_PASSWORD=$(generate_secret)
    create_secret "db_password" "$DB_PASSWORD"
    echo "📋 Database password generated. Use this in your PostgreSQL setup:"
    echo "   Username: gestaosub_user"
    echo "   Password: $DB_PASSWORD"
    echo "   Database: gestaosub"
else
    echo "⚠️  Database password already exists. Skipping..."
fi

echo ""
echo "☁️  Optional: AWS S3 configuration..."
prompt_secret "aws_access_key_id" "AWS Access Key ID"
prompt_secret "aws_secret_access_key" "AWS Secret Access Key"

echo ""
echo "📧 Optional: SMTP configuration..."
prompt_secret "smtp_user" "SMTP Username"
prompt_secret "smtp_pass" "SMTP Password"

echo ""
echo "🔐 Optional: OAuth configuration..."
prompt_secret "google_client_secret" "Google OAuth Client Secret"

echo ""
echo "🤖 Optional: AI/LLM configuration..."
prompt_secret "openai_api_key" "OpenAI API Key"
prompt_secret "anthropic_api_key" "Anthropic API Key"

echo ""
echo "🔒 Setting proper permissions on secrets directory..."
chmod 700 "$SECRETS_DIR"
chmod 600 "$SECRETS_DIR"/*.txt 2>/dev/null || true

echo ""
echo "✅ Secret generation complete!"
echo ""
echo "📋 Summary of generated secrets:"
ls -la "$SECRETS_DIR"/*.txt 2>/dev/null || echo "No secrets found"

echo ""
echo "🚀 Next steps:"
echo "1. Review the generated secrets in $SECRETS_DIR"
echo "2. Update your .env.production file with the domain and other configuration"
echo "3. Create the external 'web' network: docker network create web"
echo "4. Deploy with: docker-compose -f docker-compose.production.yml up -d"

echo ""
echo "⚠️  SECURITY REMINDERS:"
echo "- Never commit the secrets/ directory to version control"
echo "- Backup your secrets securely"
echo "- Rotate secrets regularly"
echo "- Use strong, unique passwords for all services"

echo ""
echo "🔍 To verify your deployment:"
echo "- Health check: curl -k https://yourdomain.com/api/health"
echo "- Check logs: docker-compose -f docker-compose.production.yml logs -f"