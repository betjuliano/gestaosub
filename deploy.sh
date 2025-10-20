#!/bin/bash

# Script de Deploy para GestãoSub
# Sistema de Gestão de Submissões Acadêmicas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
STACK_NAME="gestaosub"
IMAGE_NAME="gestaosub"
REGISTRY_URL="" # Adicione sua registry se necessário

echo -e "${BLUE}🚀 Iniciando deploy do GestãoSub...${NC}"

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml não encontrado. Execute o script no diretório raiz do projeto."
fi

# Verificar se o Docker Swarm está ativo
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    error "Docker Swarm não está ativo. Execute 'docker swarm init' primeiro."
fi

# Verificar se a rede iaprojetos existe
if ! docker network ls | grep -q "iaprojetos"; then
    warning "Rede 'iaprojetos' não encontrada. Criando..."
    docker network create --driver overlay --attachable iaprojetos
    log "Rede 'iaprojetos' criada com sucesso."
fi

# Build da imagem
log "Construindo imagem Docker..."
docker build -t ${IMAGE_NAME}:latest .

# Tag para registry (se configurado)
if [ ! -z "$REGISTRY_URL" ]; then
    log "Fazendo tag para registry..."
    docker tag ${IMAGE_NAME}:latest ${REGISTRY_URL}/${IMAGE_NAME}:latest
    
    log "Fazendo push para registry..."
    docker push ${REGISTRY_URL}/${IMAGE_NAME}:latest
fi

# Verificar se o stack já existe
if docker stack ls | grep -q "$STACK_NAME"; then
    log "Stack '$STACK_NAME' já existe. Atualizando..."
    docker stack deploy -c docker-compose.yml $STACK_NAME
else
    log "Criando novo stack '$STACK_NAME'..."
    docker stack deploy -c docker-compose.yml $STACK_NAME
fi

# Aguardar deploy
log "Aguardando deploy..."
sleep 10

# Verificar status dos serviços
log "Verificando status dos serviços..."
docker stack services $STACK_NAME

# Verificar se os serviços estão rodando
log "Aguardando serviços ficarem prontos..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    running_replicas=$(docker stack services $STACK_NAME --format "table {{.Replicas}}" | grep -v "REPLICAS" | grep -E "^[0-9]+/[0-9]+$" | awk -F'/' '{if($1==$2 && $1>0) print $1}' | wc -l)
    total_services=$(docker stack services $STACK_NAME --format "table {{.Replicas}}" | grep -v "REPLICAS" | wc -l)
    
    if [ "$running_replicas" -eq "$total_services" ] && [ "$total_services" -gt 0 ]; then
        log "Todos os serviços estão rodando!"
        break
    fi
    
    echo -n "."
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
    warning "Timeout aguardando serviços. Verifique manualmente com 'docker stack services $STACK_NAME'"
fi

# Mostrar logs dos serviços
log "Últimos logs dos serviços:"
docker service logs ${STACK_NAME}_gestaosub --tail 20

# Informações finais
echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${BLUE}📊 Informações do deploy:${NC}"
echo -e "  Stack: $STACK_NAME"
echo -e "  URL: https://gestaodeartigos.iaprojetos.com.br"
echo -e "  Serviços: $(docker stack services $STACK_NAME --format 'table {{.Name}}' | grep -v NAME | wc -l)"
echo ""
echo -e "${BLUE}🔧 Comandos úteis:${NC}"
echo -e "  Ver serviços: ${YELLOW}docker stack services $STACK_NAME${NC}"
echo -e "  Ver logs: ${YELLOW}docker service logs ${STACK_NAME}_gestaosub -f${NC}"
echo -e "  Remover stack: ${YELLOW}docker stack rm $STACK_NAME${NC}"
echo -e "  Escalar serviço: ${YELLOW}docker service scale ${STACK_NAME}_gestaosub=3${NC}"
echo ""

log "Deploy finalizado com sucesso! 🎉"