# 📤 Guia de Transferência para Produção

## 🎯 Objetivo
Transferir os arquivos do **GestãoSub** para o servidor de produção em `/opt/gestaosub`.

---

## 🔧 Opções de Transferência

### **Opção 1: Script Automático (Recomendado)**

#### **Windows (PowerShell):**
```powershell
cd gestaosub
.\transfer-to-server.ps1
```

#### **Linux/Mac (Bash):**
```bash
cd gestaosub
chmod +x transfer-to-server.sh
./transfer-to-server.sh
```

> **Nota:** Será solicitada a senha do servidor `root@72.60.5.74`

---

### **Opção 2: Transferência Manual via SCP**

#### **Transferir todos os arquivos:**
```bash
# Criar diretório no servidor
ssh root@72.60.5.74 "mkdir -p /opt/gestaosub"

# Transferir arquivos essenciais
scp package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.config.ts components.json root@72.60.5.74:/opt/gestaosub/

# Transferir arquivos de deploy
scp Dockerfile .dockerignore docker-compose.yml deploy.sh README-DEPLOY.md .env.production drizzle.config.ts root@72.60.5.74:/opt/gestaosub/

# Transferir diretórios
scp -r client server shared drizzle patches root@72.60.5.74:/opt/gestaosub/
```

---

### **Opção 3: Usando WinSCP (Windows)**

1. **Baixe e instale o WinSCP:** https://winscp.net/
2. **Configure a conexão:**
   - **Host:** `72.60.5.74`
   - **Usuário:** `root`
   - **Senha:** [sua senha]
   - **Protocolo:** SCP

3. **Transfira os arquivos:**
   - Navegue até `/opt/gestaosub` no servidor
   - Arraste os arquivos da pasta local `gestaosub`

---

### **Opção 4: Usando FileZilla**

1. **Baixe o FileZilla:** https://filezilla-project.org/
2. **Configure SFTP:**
   - **Host:** `sftp://72.60.5.74`
   - **Usuário:** `root`
   - **Senha:** [sua senha]
   - **Porta:** `22`

3. **Transfira os arquivos para `/opt/gestaosub`**

---

## 📋 Arquivos Essenciais para Transferir

### **📄 Arquivos de Configuração:**
- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.config.ts`
- `components.json`
- `drizzle.config.ts`

### **🐳 Arquivos de Deploy:**
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `deploy.sh`
- `README-DEPLOY.md`
- `.env.production`

### **📁 Diretórios:**
- `client/` (aplicação frontend)
- `server/` (aplicação backend)
- `shared/` (código compartilhado)
- `drizzle/` (schema e migrações)
- `patches/` (patches do pnpm)

---

## 🔐 Configuração de Chave SSH (Opcional)

Para evitar digitar a senha toda vez:

### **1. Gerar chave SSH:**
```bash
ssh-keygen -t rsa -b 4096 -C "seu-email@exemplo.com"
```

### **2. Copiar chave para o servidor:**
```bash
ssh-copy-id root@72.60.5.74
```

### **3. Testar conexão:**
```bash
ssh root@72.60.5.74
```

---

## ✅ Verificação Pós-Transferência

Após a transferência, conecte ao servidor e verifique:

```bash
# Conectar ao servidor
ssh root@72.60.5.74

# Verificar arquivos
cd /opt/gestaosub
ls -la

# Verificar se todos os arquivos estão presentes
ls -la client/ server/ shared/ drizzle/ patches/
```

---

## 🚀 Próximos Passos

Após a transferência bem-sucedida:

1. **Configurar ambiente:**
   ```bash
   cd /opt/gestaosub
   mv .env.production .env
   ```

2. **Executar deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Verificar aplicação:**
   - Acesse: https://gestaodeartigos.iaprojetos.com.br

---

## 🆘 Solução de Problemas

### **Erro de Conexão SSH:**
- Verifique se o servidor está acessível: `ping 72.60.5.74`
- Teste a conexão SSH: `ssh root@72.60.5.74`

### **Erro de Permissão:**
- Verifique se o usuário tem permissão para escrever em `/opt/`
- Use `sudo` se necessário

### **Arquivos Faltando:**
- Verifique se todos os arquivos estão na pasta local
- Execute `ls -la` para listar arquivos ocultos

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Teste a conectividade com o servidor
3. Confirme as permissões de arquivo
4. Verifique se todos os arquivos necessários estão presentes