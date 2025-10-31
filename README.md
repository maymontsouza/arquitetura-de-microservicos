# 🧩 Arquitetura de Microserviços — Sistema de Chamados

## 📖 Descrição Geral
Este projeto implementa um **Sistema de Chamados** distribuído, projetado com **arquitetura de microserviços**, **API Gateway (Traefik)** e **autenticação JWT**.  
O objetivo é demonstrar **autonomia, escalabilidade e segurança** entre domínios distintos — cada serviço possui seu próprio banco de dados e responsabilidade bem definida.

---

## 🧱 Arquitetura

```mermaid
graph LR
  A[Cliente / Browser / Postman] -->|HTTP:8081| G[Traefik API Gateway]

  subgraph Serviços
    G --> AUTH[Auth-Service<br>JWT + PostgreSQL]
    G --> DIR[Directory-Service<br>Setores e Funcionários]
    G --> TIC[Tickets-Service<br>Chamados e Atribuições]
  end

  subgraph Bancos
    AUTH --> DB1[(auth-db)]
    DIR --> DB2[(directory-db)]
    TIC --> DB3[(tickets-db)]
  end

  subgraph Observabilidade
    G --> D[Dashboard Traefik:8082]
  end

---

🧭 Portas principais

| Serviço             | Porta Interna | Rota via Gateway | Descrição                     |
| ------------------- | ------------- | ---------------- | ----------------------------- |
| `api-gateway`       | 80 / 8080     | 8081 (exposto)   | Centraliza o acesso (Traefik) |
| `auth-service`      | 3001          | `/auth`          | Autenticação, login e JWT     |
| `directory-service` | 3002          | `/directory`     | Setores e funcionários        |
| `tickets-service`   | 3003          | `/tickets`       | CRUD de chamados autenticado  |

---

⚙️ Estrutura de Pastas
arquitetura-de-microservicos/
│
├── auth-service/
│   ├── server.js
│   ├── db.js
│   ├── sql/001_init.sql
│   ├── package.json
│
├── directory-service/
│   ├── server.js
│   ├── sql/001_init.sql
│
├── tickets-service/
│   ├── server.js
│   ├── sql/001_init.sql
│
├── docker-compose.yml
├── README.md

---

🚀 Execução do Projeto
docker compose down -v
docker compose up -d --build
docker compose ps

2️⃣ Verificar serviços
curl -s http://localhost:8081/auth/health
curl -s http://localhost:8081/directory/health
curl -s http://localhost:8081/tickets/health

---

🔐 Fluxo de Autenticação JWT
1️⃣ Registrar usuário
curl -s -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"May","email":"may@example.com","password":"123456","roles":["USER","AGENTE"]}'

2️⃣ Login → gera token JWT
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"may@example.com","password":"123456"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
echo $TOKEN

3️⃣ Usar token em chamadas protegidas
curl -s -X POST http://localhost:8081/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Erro no cadastro","descricao":"stacktrace...","setor_destino_id":2,"solicitante_id":1}'

---

📊 Exemplos de Respostas

Healthcheck
{"status": "ok", "service": "auth"}

Listagem de Tickets
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

---

🧰 Tecnologias
| Categoria          | Ferramenta        |
| ------------------ | ----------------- |
| **Gateway**        | Traefik v3        |
| **Backend**        | Node.js + Express |
| **Banco**          | PostgreSQL        |
| **Autenticação**   | JWT + bcrypt      |
| **Infraestrutura** | Docker + Compose  |
