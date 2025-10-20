#!/bin/bash

# ===========================================
# Script de Transferência para Produção
# GestãoSub - Deploy para /opt/gestaosub
# ===========================================

SERVER_IP="72.60.5.74"
USERNAME="root"
TARGET_PATH="/opt/gestaosub"

echo "🚀 Iniciando transferência para produção..."
echo "📡 Servidor: $USERNAME@$SERVER_IP"
echo "📁 Destino: $TARGET_PATH"

# Verificar se o SCP está disponível
if ! command -v scp &> /dev/null; then
    echo "❌ SCP não encontrado. Instale o openssh-client."
    exit 1
fi

# Lista de arquivos essenciais para produção
FILES_TO_TRANSFER=(
    "package.json"
    "pnpm-lock.yaml"
    "tsconfig.json"
    "vite.config.ts"
    "vitest.config.ts"
    "components.json"
    "Dockerfile"
    ".dockerignore"
    "docker-compose.yml"
    "deploy.sh"
    "README-DEPLOY.md"
    ".env.production"
    "drizzle.config.ts"
)

DIRS_TO_TRANSFER=(
    "client"
    "server"
    "shared"
    "drizzle"
    "patches"
)

echo ""
echo "📦 Preparando arquivos para transferência..."

# Criar diretório temporário
TEMP_DIR="temp-deploy"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copiar arquivos essenciais
for file in "${FILES_TO_TRANSFER[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$TEMP_DIR/"
        echo "✅ $file"
    else
        echo "⚠️  $file não encontrado"
    fi
done

# Copiar diretórios
for dir in "${DIRS_TO_TRANSFER[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$TEMP_DIR/"
        echo "✅ $dir/"
    else
        echo "⚠️  $dir/ não encontrado"
    fi
done

echo ""
echo "🔐 Conectando ao servidor..."

# Criar diretório no servidor
echo "📁 Criando diretório $TARGET_PATH..."
ssh "$USERNAME@$SERVER_IP" "mkdir -p $TARGET_PATH"

if [ $? -ne 0 ]; then
    echo "❌ Erro ao conectar com o servidor"
    exit 1
fi

# Transferir arquivos
echo "📤 Transferindo arquivos..."
scp -r "$TEMP_DIR"/* "$USERNAME@$SERVER_IP:$TARGET_PATH/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Transferência concluída com sucesso!"
    
    # Limpar diretório temporário
    rm -rf "$TEMP_DIR"
    
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Conecte ao servidor: ssh $USERNAME@$SERVER_IP"
    echo "2. Navegue para: cd $TARGET_PATH"
    echo "3. Configure o .env: mv .env.production .env"
    echo "4. Execute o deploy: chmod +x deploy.sh && ./deploy.sh"
    
    echo ""
    echo "🌐 Após o deploy, acesse:"
    echo "https://gestaodeartigos.iaprojetos.com.br"
    
else
    echo ""
    echo "❌ Erro na transferência"
    rm -rf "$TEMP_DIR"
    exit 1
fi