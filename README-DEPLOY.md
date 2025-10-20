# 🚀 Deploy em Produção - GestãoSub

Este documento contém instruções detalhadas para fazer o deploy do sistema GestãoSub em produção usando Docker Swarm e Traefik.

## 📋 Pré-requisitos

### Servidor de Produção
- **Host**: 72.60.5.74
- **Acesso**: SSH como root
- **Docker**: Instalado e configurado
- **Docker Swarm**: Inicializado
- **Traefik**: Configurado e rodando

### Banco de Dados PostgreSQL
- **Host**: 72.60.5.74:5432
- **Database**: postgres
- **User**: postgres
- **Password**: fb9ffba836d8aa033520200ce1ea5409

### Domínio
- **URL**: https://gestaodeartigos.iaprojetos.com.br
- **SSL**: Gerenciado pelo Traefik com Let's Encrypt

## 🔧 Configuração Inicial

### 1. Conectar ao Servidor
```bash
ssh root@72.60.5.74
```

### 2. Verificar Docker Swarm
```bash
docker info | grep Swarm
# Deve mostrar: Swarm: active
```

### 3. Verificar Rede Traefik
```bash
docker network ls | grep iaprojetos
# Se não existir, criar:
docker network create --driver overlay --attachable iaprojetos
```

### 4. Verificar Traefik
```bash
docker stack services traefik
# Deve mostrar o Traefik rodando
```

## 📦 Deploy da Aplicação

### 1. Clonar/Transferir Código
```bash
# Opção 1: Clone do repositório
git clone <seu-repositorio> /opt/gestaosub
cd /opt/gestaosub

# Opção 2: Transferir arquivos via SCP
scp -r ./gestaosub root@72.60.5.74:/opt/
ssh root@72.60.5.74
cd /opt/gestaosub
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de ambiente
cp .env.production .env

# Editar se necessário
nano .env
```

### 3. Executar Deploy
```bash
# Dar permissão ao script
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

### 4. Deploy Manual (alternativo)
```bash
# Build da imagem
docker build -t gestaosub:latest .

# Deploy do stack
docker stack deploy -c docker-compose.yml gestaosub
```

## 🔍 Verificação e Monitoramento

### Verificar Serviços
```bash
# Listar stacks
docker stack ls

# Verificar serviços do stack
docker stack services gestaosub

# Ver detalhes de um serviço
docker service inspect gestaosub_gestaosub
```

### Verificar Logs
```bash
# Logs do serviço principal
docker service logs gestaosub_gestaosub -f

# Logs com timestamp
docker service logs gestaosub_gestaosub -f --timestamps

# Últimas 100 linhas
docker service logs gestaosub_gestaosub --tail 100
```

### Health Check
```bash
# Verificar health check
curl -f http://localhost:3000/health

# Verificar via HTTPS
curl -f https://gestaodeartigos.iaprojetos.com.br/health
```

## 🔄 Operações de Manutenção

### Atualizar Aplicação
```bash
# Rebuild da imagem
docker build -t gestaosub:latest .

# Atualizar serviço
docker service update --image gestaosub:latest gestaosub_gestaosub

# Ou re-deploy completo
docker stack deploy -c docker-compose.yml gestaosub
```

### Escalar Serviços
```bash
# Escalar para 3 réplicas
docker service scale gestaosub_gestaosub=3

# Verificar escalamento
docker service ls
```

### Rollback
```bash
# Rollback para versão anterior
docker service rollback gestaosub_gestaosub
```

### Remover Stack
```bash
# Remover completamente
docker stack rm gestaosub

# Verificar remoção
docker stack ls
```

## 🗄️ Banco de Dados

### Executar Migrações
```bash
# Conectar ao container
docker exec -it $(docker ps -q -f name=gestaosub_gestaosub) sh

# Dentro do container
pnpm run db:push
```

### Backup do Banco
```bash
# Backup completo
pg_dump -h 72.60.5.74 -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -h 72.60.5.74 -U postgres -d postgres < backup_file.sql
```

## 🔐 Segurança

### Variáveis Sensíveis
- ✅ JWT_SECRET: Configurado no .env
- ✅ Database credentials: Configurados
- ✅ HTTPS: Gerenciado pelo Traefik
- ✅ Security headers: Configurados no Traefik

### Firewall
```bash
# Verificar portas abertas
netstat -tlnp

# Configurar firewall (se necessário)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
```

## 📊 Monitoramento

### Métricas do Docker
```bash
# Uso de recursos
docker stats

# Informações do sistema
docker system df
docker system info
```

### Logs do Sistema
```bash
# Logs do Docker
journalctl -u docker -f

# Logs do sistema
tail -f /var/log/syslog
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Serviço não inicia
```bash
# Verificar logs detalhados
docker service logs gestaosub_gestaosub --details

# Verificar eventos
docker events --filter service=gestaosub_gestaosub
```

#### Problemas de conectividade
```bash
# Verificar rede
docker network inspect iaprojetos

# Testar conectividade interna
docker run --rm --network iaprojetos alpine ping gestaosub_gestaosub
```

#### Problemas de SSL
```bash
# Verificar certificados do Traefik
docker exec -it $(docker ps -q -f name=traefik) ls -la /etc/traefik/letsencrypt/

# Logs do Traefik
docker service logs traefik_traefik
```

### Comandos de Debug
```bash
# Entrar no container
docker exec -it $(docker ps -q -f name=gestaosub_gestaosub) sh

# Verificar variáveis de ambiente
docker exec $(docker ps -q -f name=gestaosub_gestaosub) env

# Verificar conectividade com banco
docker exec $(docker ps -q -f name=gestaosub_gestaosub) nc -zv 72.60.5.74 5432
```

## 📞 Suporte

### Informações de Contato
- **Portainer**: https://portainers.iaprojetos.com.br
- **Usuário**: iaprojetos
- **Senha**: Iaprojetos@1

### Comandos Úteis
```bash
# Status geral
docker stack ps gestaosub

# Reiniciar serviço
docker service update --force gestaosub_gestaosub

# Limpar recursos não utilizados
docker system prune -f
```

---

## 🎯 Checklist de Deploy

- [ ] Servidor configurado e acessível
- [ ] Docker Swarm inicializado
- [ ] Traefik rodando
- [ ] Rede `iaprojetos` criada
- [ ] Código transferido para servidor
- [ ] Arquivo `.env` configurado
- [ ] Build da imagem executado
- [ ] Stack deployado
- [ ] Serviços rodando
- [ ] Health check passando
- [ ] SSL funcionando
- [ ] Aplicação acessível via HTTPS
- [ ] Banco de dados conectado
- [ ] Migrações executadas

**✅ Deploy concluído com sucesso!**