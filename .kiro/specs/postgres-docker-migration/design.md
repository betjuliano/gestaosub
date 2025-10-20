# Design Document

## Overview

Este documento descreve o design técnico para migrar o Sistema de Gestão Acadêmica de MySQL para PostgreSQL e preparar a aplicação para produção usando Docker Swarm, Portainer e Traefik. A solução manterá a arquitetura existente enquanto otimiza para produção.

## Architecture

### Current Architecture
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + tRPC + TypeScript
- **Database**: MySQL + Drizzle ORM
- **Authentication**: JWT + bcrypt

### Target Architecture
- **Frontend**: React + TypeScript + Vite (containerizado)
- **Backend**: Express.js + tRPC + TypeScript (containerizado)
- **Database**: PostgreSQL (servidor externo 72.60.5.74:5432)
- **Reverse Proxy**: Traefik (existente)
- **Orchestration**: Docker Swarm
- **Management**: Portainer

## Components and Interfaces

### 1. Database Migration Layer

**PostgreSQL Adapter**
```typescript
// Migração do Drizzle MySQL para PostgreSQL
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Configuração de conexão
const connectionString = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
```

**Schema Migration**
- Converter tipos MySQL para PostgreSQL equivalentes
- Manter relacionamentos e índices existentes
- Preservar enums e constraints

### 2. Container Architecture

**Frontend Container**
- Base: `node:20-alpine`
- Build stage: Vite build otimizado
- Runtime: nginx para servir assets estáticos
- Health check: HTTP GET /

**Backend Container**
- Base: `node:20-alpine`
- Runtime: Node.js com PM2 para produção
- Health check: HTTP GET /health
- Logs: structured JSON logging

### 3. Docker Swarm Configuration

**Stack Structure**
```yaml
version: '3.8'
services:
  frontend:
    image: gestaosub-frontend:latest
    networks:
      - iaprojetos
    deploy:
      replicas: 2
      labels:
        - traefik.enable=true
        - traefik.http.routers.gestaosub.rule=Host(`gestaodeartigos.iaprojetos.com.br`)
        
  backend:
    image: gestaosub-backend:latest
    networks:
      - iaprojetos
    environment:
      - DATABASE_URL=postgresql://postgres:fb9ffba836d8aa033520200ce1ea5409@72.60.5.74:5432/postgres
```

### 4. Traefik Integration

**Labels Configuration**
- Router rule: `Host(gestaodeartigos.iaprojetos.com.br)`
- TLS: Let's Encrypt automatic certificate
- Network: `iaprojetos` (existing)
- Load balancing: round-robin

### 5. Environment Configuration

**Production Variables**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:fb9ffba836d8aa033520200ce1ea5409@72.60.5.74:5432/postgres
JWT_SECRET=<secure-production-secret>
DOMAIN=gestaodeartigos.iaprojetos.com.br
```

## Data Models

### PostgreSQL Schema Conversion

**Type Mappings**
- `mysqlTable` → `pgTable`
- `varchar()` → `varchar()` (compatible)
- `text()` → `text()` (compatible)
- `timestamp()` → `timestamp()` (compatible)
- `mysqlEnum()` → `pgEnum()` (requires definition)
- `int()` → `integer()` (compatible)

**Enum Definitions**
```typescript
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const nivelFormacaoEnum = pgEnum('nivelFormacao', ['graduacao', 'mestrado', 'doutorado', 'pos_doutorado']);
export const statusEnum = pgEnum('status', ['EM_AVALIACAO', 'APROVADO', 'REJEITADO', 'REVISAO_SOLICITADA', 'SUBMETIDO_NOVAMENTE']);
```

## Error Handling

### Database Connection
- Connection pooling with retry logic
- Graceful degradation when database is unavailable
- Health checks for database connectivity

### Container Health
- Liveness probes for container restart
- Readiness probes for traffic routing
- Resource limits and monitoring

### Application Errors
- Structured error logging
- Error boundaries in React
- API error responses with appropriate HTTP codes

## Testing Strategy

### Database Migration Testing
- Schema validation tests
- Data integrity tests
- Performance comparison tests
- Rollback procedures

### Container Testing
- Multi-stage build validation
- Security scanning
- Resource usage testing
- Health check validation

### Integration Testing
- End-to-end API testing
- Frontend-backend integration
- Database connectivity testing
- Traefik routing validation

### Production Readiness
- Load testing
- SSL certificate validation
- Monitoring and alerting setup
- Backup and recovery procedures

## Security Considerations

### Container Security
- Non-root user execution
- Minimal base images (Alpine)
- Security scanning in CI/CD
- Secret management via Docker secrets

### Network Security
- Internal network isolation
- TLS termination at Traefik
- Database connection encryption
- CORS configuration

### Application Security
- JWT token validation
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting

## Performance Optimizations

### Frontend
- Static asset optimization
- Gzip compression
- CDN-ready asset structure
- Bundle splitting

### Backend
- Connection pooling
- Query optimization
- Caching strategies
- PM2 cluster mode

### Database
- Index optimization
- Query performance monitoring
- Connection pooling
- Read replicas (future consideration)

## Monitoring and Observability

### Health Checks
- Application health endpoints
- Database connectivity checks
- External service dependencies
- Resource utilization monitoring

### Logging
- Structured JSON logging
- Centralized log aggregation
- Error tracking and alerting
- Performance metrics

### Metrics
- Application performance metrics
- Database query performance
- Container resource usage
- Business metrics (submissions, users)

## Deployment Strategy

### Build Process
1. Multi-stage Docker builds
2. Image optimization and scanning
3. Automated testing pipeline
4. Image registry push

### Deployment Process
1. Blue-green deployment strategy
2. Database migration execution
3. Service health validation
4. Traffic routing update

### Rollback Strategy
1. Previous image rollback
2. Database migration rollback
3. Configuration rollback
4. Health validation