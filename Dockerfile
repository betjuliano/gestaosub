# Dockerfile para GestãoSub - Sistema de Gestão de Submissões Acadêmicas
# Multi-stage build otimizado para produção

# Stage 1: Build dependencies and application
FROM node:20-alpine AS builder

# Instalar dependências do sistema necessárias para build
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração do package manager primeiro (para cache de layers)
COPY package.json pnpm-lock.yaml* ./

# Instalar pnpm globalmente com versão específica
RUN npm install -g pnpm@10.4.1

# Configurar pnpm para otimizar build
RUN pnpm config set store-dir ~/.pnpm-store
RUN pnpm config set network-timeout 300000

# Instalar dependências (incluindo devDependencies para build)
RUN pnpm install --frozen-lockfile --prefer-offline

# Copiar código fonte (depois das dependências para melhor cache)
COPY . .

# Build da aplicação com otimizações
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN pnpm run build

# Limpar cache de build e arquivos desnecessários
RUN pnpm store prune && \
    rm -rf ~/.pnpm-store && \
    rm -rf node_modules/.cache && \
    rm -rf .next/cache

# Stage 2: Production runtime
FROM node:20-alpine AS runner

# Instalar dependências do sistema para runtime
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata \
    tini \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 gestaosub \
    && adduser --system --uid 1001 --ingroup gestaosub gestaosub

# Definir diretório de trabalho
WORKDIR /app

# Instalar pnpm com versão específica
RUN npm install -g pnpm@10.4.1

# Copiar package.json e pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Instalar apenas dependências de produção com otimizações
RUN pnpm config set store-dir ~/.pnpm-store && \
    pnpm install --prod --frozen-lockfile --prefer-offline && \
    pnpm store prune && \
    rm -rf ~/.pnpm-store && \
    npm cache clean --force

# Copiar arquivos buildados do stage anterior com ownership correto
COPY --from=builder --chown=gestaosub:gestaosub /app/dist ./dist
COPY --from=builder --chown=gestaosub:gestaosub /app/client/dist ./client/dist
COPY --from=builder --chown=gestaosub:gestaosub /app/drizzle ./drizzle

# Copiar arquivos de configuração necessários (se existir)
COPY --chown=gestaosub:gestaosub env.example .env.example

# Criar diretórios necessários com permissões corretas
RUN mkdir -p /app/logs /app/uploads /app/temp /app/backups \
    && chown -R gestaosub:gestaosub /app/logs /app/uploads /app/temp /app/backups

# Configurar timezone
RUN ln -sf /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime

# Mudar para usuário não-root
USER gestaosub

# Expor porta
EXPOSE 3000

# Variáveis de ambiente otimizadas para produção
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Sao_Paulo
ENV NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps"
ENV UV_THREADPOOL_SIZE=4

# Labels para metadados
LABEL maintainer="GestãoSub Team"
LABEL version="1.0.0"
LABEL description="Sistema de Gestão de Submissões Acadêmicas"
LABEL org.opencontainers.image.source="https://github.com/gestaosub/gestaosub"
LABEL org.opencontainers.image.documentation="https://github.com/gestaosub/gestaosub/blob/main/README.md"

# Health check otimizado com endpoint específico
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização com tini para proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]