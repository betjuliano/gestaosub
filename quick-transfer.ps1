# ===========================================
# Comandos para Transferência Manual
# GestãoSub - Deploy para /opt/gestaosub
# ===========================================

Write-Host "🚀 Comandos para transferir arquivos para produção" -ForegroundColor Green
Write-Host "📡 Servidor: root@72.60.5.74" -ForegroundColor Cyan
Write-Host "📁 Destino: /opt/gestaosub" -ForegroundColor Cyan

Write-Host "`n📋 Execute os comandos abaixo um por vez:" -ForegroundColor Yellow

Write-Host "`n1️⃣ Criar diretório no servidor:" -ForegroundColor White
Write-Host 'ssh root@72.60.5.74 "mkdir -p /opt/gestaosub"' -ForegroundColor Gray

Write-Host "`n2️⃣ Transferir arquivos de configuração:" -ForegroundColor White
Write-Host 'scp package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.config.ts components.json drizzle.config.ts root@72.60.5.74:/opt/gestaosub/' -ForegroundColor Gray

Write-Host "`n3️⃣ Transferir arquivos de deploy:" -ForegroundColor White
Write-Host 'scp Dockerfile .dockerignore docker-compose.yml deploy.sh README-DEPLOY.md .env.production root@72.60.5.74:/opt/gestaosub/' -ForegroundColor Gray

Write-Host "`n4️⃣ Transferir diretórios:" -ForegroundColor White
Write-Host 'scp -r client server shared drizzle patches root@72.60.5.74:/opt/gestaosub/' -ForegroundColor Gray

Write-Host "`n5️⃣ Conectar ao servidor e configurar:" -ForegroundColor White
Write-Host 'ssh root@72.60.5.74' -ForegroundColor Gray
Write-Host 'cd /opt/gestaosub' -ForegroundColor Gray
Write-Host 'mv .env.production .env' -ForegroundColor Gray
Write-Host 'chmod +x deploy.sh' -ForegroundColor Gray
Write-Host './deploy.sh' -ForegroundColor Gray

Write-Host "`n✅ Após o deploy, acesse:" -ForegroundColor Green
Write-Host "https://gestaodeartigos.iaprojetos.com.br" -ForegroundColor Blue

Write-Host "`n💡 Dica: Copie e cole cada comando no terminal" -ForegroundColor Yellow