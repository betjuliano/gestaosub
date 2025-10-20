# Traefik Setup Script for Production Deployment (PowerShell)
# This script sets up the necessary Docker networks and directories for Traefik

param(
    [switch]$Force = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up Traefik for production deployment..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Status "Docker is running ✓"
} catch {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

# Create external web network if it doesn't exist
$networkExists = docker network ls --format "{{.Name}}" | Where-Object { $_ -eq "web" }
if (-not $networkExists) {
    Write-Status "Creating external 'web' network for Traefik..."
    docker network create web
    Write-Success "External 'web' network created"
} else {
    Write-Warning "External 'web' network already exists"
}

# Create necessary directories
Write-Status "Creating necessary directories..."

# Create certificates directory
if (-not (Test-Path "./certs")) {
    New-Item -ItemType Directory -Path "./certs" -Force | Out-Null
    Write-Success "Created certificates directory"
} else {
    Write-Warning "Certificates directory already exists"
}

# Create logs directory
if (-not (Test-Path "./logs/traefik")) {
    New-Item -ItemType Directory -Path "./logs/traefik" -Force | Out-Null
    Write-Success "Created Traefik logs directory"
} else {
    Write-Warning "Traefik logs directory already exists"
}

# Create backups directory
if (-not (Test-Path "./backups")) {
    New-Item -ItemType Directory -Path "./backups" -Force | Out-Null
    Write-Success "Created backups directory"
} else {
    Write-Warning "Backups directory already exists"
}

# Verify secrets directory and files
Write-Status "Verifying secrets configuration..."

if (-not (Test-Path "./secrets")) {
    New-Item -ItemType Directory -Path "./secrets" -Force | Out-Null
    Write-Success "Created secrets directory"
}

# Check required secret files
$requiredSecrets = @("db_password.txt", "jwt_secret.txt", "cookie_secret.txt")
$missingSecrets = @()

foreach ($secret in $requiredSecrets) {
    if (-not (Test-Path "./secrets/$secret")) {
        $missingSecrets += $secret
    }
}

if ($missingSecrets.Count -gt 0) {
    Write-Warning "Missing secret files: $($missingSecrets -join ', ')"
    Write-Status "Creating placeholder secret files (CHANGE THESE IN PRODUCTION!)..."
    
    foreach ($secret in $missingSecrets) {
        switch ($secret) {
            "db_password.txt" {
                "change-this-secure-db-password-$(Get-Date -Format 'yyyyMMddHHmmss')" | Out-File -FilePath "./secrets/$secret" -Encoding UTF8 -NoNewline
            }
            "jwt_secret.txt" {
                $bytes = New-Object byte[] 64
                [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
                [Convert]::ToBase64String($bytes) | Out-File -FilePath "./secrets/$secret" -Encoding UTF8 -NoNewline
            }
            "cookie_secret.txt" {
                $bytes = New-Object byte[] 32
                [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
                [Convert]::ToBase64String($bytes) | Out-File -FilePath "./secrets/$secret" -Encoding UTF8 -NoNewline
            }
        }
        Write-Success "Created $secret"
    }
    
    Write-Warning "⚠️  IMPORTANT: Update the generated secrets with secure values before production deployment!"
} else {
    Write-Success "All required secret files exist"
}

# Verify environment configuration
Write-Status "Verifying environment configuration..."

if (-not (Test-Path ".env.production")) {
    if (Test-Path ".env.production.template") {
        Write-Warning ".env.production not found, copying from template..."
        Copy-Item ".env.production.template" ".env.production"
        Write-Success "Created .env.production from template"
        Write-Warning "⚠️  IMPORTANT: Update .env.production with your actual domain and configuration!"
    } else {
        Write-Error ".env.production.template not found. Cannot create environment file."
        exit 1
    }
} else {
    Write-Success "Environment configuration exists"
}

# Validate Traefik configuration files
Write-Status "Validating Traefik configuration..."

$traefikConfigs = @(
    "traefik/traefik.yml",
    "traefik/dynamic/middlewares.yml",
    "traefik/dynamic/routers.yml",
    "traefik/dynamic/tls.yml",
    "traefik/dynamic/monitoring.yml"
)

foreach ($config in $traefikConfigs) {
    if (-not (Test-Path $config)) {
        Write-Error "Missing Traefik configuration: $config"
        exit 1
    }
}

Write-Success "All Traefik configuration files exist"

# Test Traefik configuration syntax (if traefik command is available)
try {
    $traefikVersion = traefik version 2>$null
    Write-Status "Testing Traefik configuration syntax..."
    $result = traefik validate --configfile=traefik/traefik.yml 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Traefik configuration is valid"
    } else {
        Write-Error "Traefik configuration has syntax errors: $result"
        exit 1
    }
} catch {
    Write-Warning "Traefik command not available, skipping syntax validation"
}

# Final summary
Write-Host ""
Write-Success "🎉 Traefik setup completed successfully!"
Write-Host ""
Write-Status "Next steps:"
Write-Host "  1. Update .env.production with your actual domain and email"
Write-Host "  2. Update secrets in ./secrets/ directory with secure values"
Write-Host "  3. Run: docker-compose up -d traefik"
Write-Host "  4. Verify Traefik dashboard at: https://traefik.yourdomain.com"
Write-Host ""
Write-Warning "⚠️  Security reminders:"
Write-Host "  - Change all default passwords and secrets"
Write-Host "  - Verify firewall rules (ports 80, 443)"
Write-Host "  - Test SSL certificate generation"
Write-Host "  - Configure monitoring and alerting"
Write-Host ""