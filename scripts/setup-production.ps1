# Production Setup Script for GestãoSub (PowerShell)
param(
    [switch]$Force
)

Write-Host "🚀 Setting up GestãoSub for production deployment..." -ForegroundColor Green

# Create external network if it doesn't exist
Write-Host "📡 Creating external network 'web'..." -ForegroundColor Yellow
try {
    docker network create web 2>$null
    Write-Host "Network 'web' created successfully" -ForegroundColor Green
} catch {
    Write-Host "Network 'web' already exists" -ForegroundColor Yellow
}

# Create necessary directories
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
$directories = @("traefik\dynamic", "secrets", "backups", "logs")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# Generate secure secrets if they don't exist or are default values
Write-Host "🔐 Generating secure secrets..." -ForegroundColor Yellow

function Generate-SecurePassword {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Database password
$dbPasswordFile = "secrets\db_password.txt"
if (!(Test-Path $dbPasswordFile) -or (Get-Content $dbPasswordFile -Raw).Trim() -eq "your-secure-database-password-here" -or $Force) {
    Write-Host "Generating database password..." -ForegroundColor Cyan
    Generate-SecurePassword -Length 32 | Out-File -FilePath $dbPasswordFile -Encoding UTF8 -NoNewline
}

# JWT secret
$jwtSecretFile = "secrets\jwt_secret.txt"
if (!(Test-Path $jwtSecretFile) -or (Get-Content $jwtSecretFile -Raw).Trim() -eq "your-super-secure-jwt-secret-key-minimum-32-characters-long" -or $Force) {
    Write-Host "Generating JWT secret..." -ForegroundColor Cyan
    Generate-SecurePassword -Length 64 | Out-File -FilePath $jwtSecretFile -Encoding UTF8 -NoNewline
}

# Cookie secret
$cookieSecretFile = "secrets\cookie_secret.txt"
if (!(Test-Path $cookieSecretFile) -or (Get-Content $cookieSecretFile -Raw).Trim() -eq "your-secure-cookie-secret-key-for-session-encryption" -or $Force) {
    Write-Host "Generating cookie secret..." -ForegroundColor Cyan
    Generate-SecurePassword -Length 32 | Out-File -FilePath $cookieSecretFile -Encoding UTF8 -NoNewline
}

# Create acme.json file for Let's Encrypt certificates
$acmeFile = "traefik\acme.json"
if (!(Test-Path $acmeFile)) {
    Write-Host "📜 Creating acme.json for SSL certificates..." -ForegroundColor Yellow
    New-Item -ItemType File -Path $acmeFile -Force | Out-Null
}

# Check if .env.production exists
if (!(Test-Path ".env.production")) {
    Write-Host "⚠️  Creating .env.production from template..." -ForegroundColor Yellow
    Copy-Item ".env.production.template" ".env.production"
    Write-Host "📝 Please edit .env.production with your actual configuration values" -ForegroundColor Cyan
}

# Validate Docker and Docker Compose
Write-Host "🐳 Validating Docker installation..." -ForegroundColor Yellow

try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    try {
        docker compose version | Out-Null
        Write-Host "✅ Docker Compose (v2) is installed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
        exit 1
    }
}

# Test Docker daemon
try {
    docker info | Out-Null
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Production environment setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env.production with your actual configuration values"
Write-Host "2. Update secrets files in .\secrets\ directory if needed"
Write-Host "3. Run 'docker-compose up -d' to start the services"
Write-Host "4. Check logs with 'docker-compose logs -f'"
Write-Host ""
Write-Host "Important files to configure:" -ForegroundColor Yellow
Write-Host "- .env.production (domain, email, database settings)"
Write-Host "- secrets\db_password.txt (database password)"
Write-Host "- secrets\jwt_secret.txt (JWT signing key)"
Write-Host "- secrets\cookie_secret.txt (session encryption key)"