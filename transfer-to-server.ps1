# ===========================================
# Script de Transferência para Produção
# GestãoSub - Deploy para /opt/gestaosub
# ===========================================

param(
    [string]$ServerIP = "72.60.5.74",
    [string]$Username = "root",
    [string]$TargetPath = "/opt/gestaosub"
)

Write-Host "🚀 Iniciando transferência para produção..." -ForegroundColor Green
Write-Host "📡 Servidor: $Username@$ServerIP" -ForegroundColor Cyan
Write-Host "📁 Destino: $TargetPath" -ForegroundColor Cyan

# Verificar se o SCP está disponível
try {
    scp 2>&1 | Out-Null
} catch {
    Write-Host "❌ SCP não encontrado. Instale o OpenSSH Client." -ForegroundColor Red
    Write-Host "💡 Execute: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
    exit 1
}

# Lista de arquivos essenciais para produção
$FilesToTransfer = @(
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "vite.config.ts",
    "vitest.config.ts",
    "components.json",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    "deploy.sh",
    "README-DEPLOY.md",
    ".env.production",
    "drizzle.config.ts"
)

$DirectoriesToTransfer = @(
    "client",
    "server",
    "shared",
    "drizzle",
    "patches"
)

Write-Host "`n📦 Preparando arquivos para transferência..." -ForegroundColor Yellow

# Criar diretório temporário para organizar arquivos
$TempDir = "temp-deploy"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copiar arquivos essenciais
foreach ($file in $FilesToTransfer) {
    if (Test-Path $file) {
        Copy-Item $file $TempDir -Force
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $file não encontrado" -ForegroundColor Yellow
    }
}

# Copiar diretórios
foreach ($dir in $DirectoriesToTransfer) {
    if (Test-Path $dir) {
        Copy-Item $dir $TempDir -Recurse -Force
        Write-Host "✅ $dir/" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $dir/ não encontrado" -ForegroundColor Yellow
    }
}

Write-Host "`n🔐 Conectando ao servidor..." -ForegroundColor Yellow

# Criar diretório no servidor
Write-Host "📁 Criando diretório $TargetPath..." -ForegroundColor Cyan
ssh $Username@$ServerIP "mkdir -p $TargetPath"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar com o servidor" -ForegroundColor Red
    exit 1
}

# Transferir arquivos
Write-Host "📤 Transferindo arquivos..." -ForegroundColor Cyan
scp -r "$TempDir/*" "$Username@$ServerIP`:$TargetPath/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Transferência concluída com sucesso!" -ForegroundColor Green
    
    # Limpar diretório temporário
    Remove-Item $TempDir -Recurse -Force
    
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Conecte ao servidor: ssh $Username@$ServerIP" -ForegroundColor White
    Write-Host "2. Navegue para: cd $TargetPath" -ForegroundColor White
    Write-Host "3. Configure o .env: mv .env.production .env" -ForegroundColor White
    Write-Host "4. Execute o deploy: chmod +x deploy.sh && ./deploy.sh" -ForegroundColor White
    
    Write-Host "`n🌐 Após o deploy, acesse:" -ForegroundColor Cyan
    Write-Host "https://gestaodeartigos.iaprojetos.com.br" -ForegroundColor Blue
    
} else {
    Write-Host "`n❌ Erro na transferência" -ForegroundColor Red
    Remove-Item $TempDir -Recurse -Force
    exit 1
}