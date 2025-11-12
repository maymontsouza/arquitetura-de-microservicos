# 🧩 Arquitetura de Microserviços — Sistema de Chamados

### 📖 Descrição Geral
Este projeto implementa um **Sistema de Chamados**, projetado com **arquitetura de microserviços**, **API Gateway (Traefik)** e **autenticação JWT**.  

---

### 🔄 Fluxo Geral

1. O **usuário** faz uma requisição HTTP para o **Traefik (API Gateway)**.  
2. O **gateway** identifica o caminho da requisição (`/auth`, `/directory`, `/tickets`) e encaminha para o serviço correto.  
3. Cada serviço processa sua lógica internamente e responde ao cliente.  
4. O **auth-service** gera tokens JWT para autenticação e proteção das rotas dos outros serviços.  
5. Os serviços **directory** e **tickets** armazenam dados em seus próprios bancos **PostgreSQL**.


---

### 🧭 Portas principais

| Serviço             | Porta Interna | Rota via Gateway | Descrição                     |
| ------------------- | ------------- | ---------------- | ----------------------------- |
| `api-gateway`       | 80 / 8080     | 8081 (exposto)   | Centraliza o acesso (Traefik) |
| `auth-service`      | 3001          | `/auth`          | Autenticação, login e JWT     |
| `directory-service` | 3002          | `/directory`     | Setores e funcionários        |
| `tickets-service`   | 3003          | `/tickets`       | CRUD de chamados autenticado  |

---

### ⚙️ Função de cada serviço

| Serviço                   | Descrição                                                                                                   | Banco de Dados |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| **Auth-Service**          | Responsável por **cadastro, login, criptografia de senhas (bcrypt)** e geração de **tokens JWT**.           | `auth-db`      |
| **Directory-Service**     | Armazena **setores e funcionários**, servindo como referência para os chamados.                             | `directory-db` |
| **Tickets-Service**       | Gerencia **criação, listagem e atualização de chamados**. Requer autenticação JWT.                          | `tickets-db`   |
| **API Gateway (Traefik)** | Controla o **roteamento das requisições** entre os serviços e oferece painel de monitoramento (porta 8082). | —              |


---

### 🚀 Execução do Projeto
```
docker compose down -v
docker compose up -d --build
docker compose ps
```

2️⃣ Verificar serviços
```
# Auth
iwr http://localhost:8081/auth/health | Select-Object -Expand Content
# Directory
iwr http://localhost:8081/directory/health | Select-Object -Expand Content
# Tickets
iwr http://localhost:8081/tickets/health | Select-Object -Expand Content
```
---

###  🔐 Fluxo de Autenticação JWT

1️⃣ Registrar usuário
```
curl -s -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"May","email":"may@example.com","password":"123456","roles":["USER","AGENTE"]}'
```

2️⃣ Login → gera token JWT
```
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"may@example.com","password":"123456"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo $TOKEN
```

3️⃣ Usar token em chamadas protegidas
```
curl -s -X POST http://localhost:8081/tickets \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"titulo":"Erro no cadastro","descricao":"stacktrace...","setor_destino_id":2,"solicitante_id":1}'
```

---

### 📊 Exemplos de Respostas

Healthcheck
```
{"status": "ok", "service": "auth"}
```

Listagem de Tickets
```
[
  {
    "id": 1,
    "titulo": "Erro na tela",
    "descricao": "Não carrega",
    "status": "Aberto",
    "setor_destino_id": 2,
    "solicitante_id": 1
  }
]
```

---

### 🧰 Tecnologias
| Categoria          | Ferramenta        |
| ------------------ | ----------------- |
| **Gateway**        | Traefik v3        |
| **Backend**        | Node.js + Express |
| **Banco**          | PostgreSQL        |
| **Autenticação**   | JWT + bcrypt      |
| **Infraestrutura** | Docker + Compose  |
