# Generate Docker secrets for production deployment
# PowerShell version for Windows systems

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

$SecretsDir = ".\secrets"
$BackupDir = ".\secrets\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "🔐 Generating Docker secrets for GestãoSub production deployment..." -ForegroundColor Green

# Create secrets directory if it doesn't exist
if (!(Test-Path $SecretsDir)) {
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
}

# Backup existing secrets if they exist
$existingSecrets = Get-ChildItem -Path "$SecretsDir\*.txt" -ErrorAction SilentlyContinue
if ($existingSecrets) {
    Write-Host "📦 Backing up existing secrets to $BackupDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Copy-Item -Path "$SecretsDir\*.txt" -Destination $BackupDir -ErrorAction SilentlyContinue
}

# Function to generate a secure random string
function Generate-Secret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return [Convert]::ToBase64String($bytes) -replace '[=+/]', '' | Select-Object -First 32
}

# Function to create secret file
function Create-Secret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    $file = Join-Path $SecretsDir "$Name.txt"
    $Value | Out-File -FilePath $file -Encoding UTF8 -NoNewline
    
    # Set file permissions (Windows equivalent)
    $acl = Get-Acl $file
    $acl.SetAccessRuleProtection($true, $false)
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
        "FullControl",
        "Allow"
    )
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $file -AclObject $acl
    
    Write-Host "✅ Created secret: $Name" -ForegroundColor Green
}

# Function to prompt for secret value
function Prompt-Secret {
    param(
        [string]$Name,
        [string]$Description
    )
    
    $file = Join-Path $SecretsDir "$Name.txt"
    
    if ((Test-Path $file) -and !$Force) {
        Write-Host "⚠️  Secret $Name already exists. Skipping..." -ForegroundColor Yellow
        return
    }
    
    Write-Host "📝 Enter $Description (leave empty to skip):" -ForegroundColor Cyan
    $value = Read-Host -AsSecureString
    $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($value))
    
    if ($plainValue) {
        Create-Secret -Name $Name -Value $plainValue
    } else {
        Write-Host "⏭️  Skipped: $Name" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔑 Generating application secrets..." -ForegroundColor Cyan

# Generate required application secrets
Create-Secret -Name "jwt_secret" -Value (Generate-Secret)
Create-Secret -Name "cookie_secret" -Value (Generate-Secret)

Write-Host ""
Write-Host "🗄️  Database configuration..." -ForegroundColor Cyan

# Database password
$dbPasswordFile = Join-Path $SecretsDir "db_password.txt"
if (!(Test-Path $dbPasswordFile) -or $Force) {
    $dbPassword = Generate-Secret
    Create-Secret -Name "db_password" -Value $dbPassword
    Write-Host "📋 Database password generated. Use this in your PostgreSQL setup:" -ForegroundColor Yellow
    Write-Host "   Username: gestaosub_user" -ForegroundColor White
    Write-Host "   Password: $dbPassword" -ForegroundColor White
    Write-Host "   Database: gestaosub" -ForegroundColor White
} else {
    Write-Host "⚠️  Database password already exists. Skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "☁️  Optional: AWS S3 configuration..." -ForegroundColor Cyan
Prompt-Secret -Name "aws_access_key_id" -Description "AWS Access Key ID"
Prompt-Secret -Name "aws_secret_access_key" -Description "AWS Secret Access Key"

Write-Host ""
Write-Host "📧 Optional: SMTP configuration..." -ForegroundColor Cyan
Prompt-Secret -Name "smtp_user" -Description "SMTP Username"
Prompt-Secret -Name "smtp_pass" -Description "SMTP Password"

Write-Host ""
Write-Host "🔐 Optional: OAuth configuration..." -ForegroundColor Cyan
Prompt-Secret -Name "google_client_secret" -Description "Google OAuth Client Secret"

Write-Host ""
Write-Host "🤖 Optional: AI/LLM configuration..." -ForegroundColor Cyan
Prompt-Secret -Name "openai_api_key" -Description "OpenAI API Key"
Prompt-Secret -Name "anthropic_api_key" -Description "Anthropic API Key"

Write-Host ""
Write-Host "✅ Secret generation complete!" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Summary of generated secrets:" -ForegroundColor Cyan
Get-ChildItem -Path "$SecretsDir\*.txt" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "   $($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Green
Write-Host "1. Review the generated secrets in $SecretsDir" -ForegroundColor White
Write-Host "2. Update your .env.production file with the domain and other configuration" -ForegroundColor White
Write-Host "3. Create the external 'web' network: docker network create web" -ForegroundColor White
Write-Host "4. Deploy with: docker-compose -f docker-compose.production.yml up -d" -ForegroundColor White

Write-Host ""
Write-Host "⚠️  SECURITY REMINDERS:" -ForegroundColor Red
Write-Host "- Never commit the secrets/ directory to version control" -ForegroundColor Yellow
Write-Host "- Backup your secrets securely" -ForegroundColor Yellow
Write-Host "- Rotate secrets regularly" -ForegroundColor Yellow
Write-Host "- Use strong, unique passwords for all services" -ForegroundColor Yellow

Write-Host ""
Write-Host "🔍 To verify your deployment:" -ForegroundColor Cyan
Write-Host "- Health check: curl -k https://yourdomain.com/api/health" -ForegroundColor White
Write-Host "- Check logs: docker-compose -f docker-compose.production.yml logs -f" -ForegroundColor White