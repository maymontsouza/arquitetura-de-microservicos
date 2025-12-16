# 🧩 Arquitetura de Microserviços — Sistema de Chamados #

**Sistema de Chamados** usando **arquitetura de microserviços**, com **API Gateway (Traefik)**, **autenticação via JWT**, bancos **PostgreSQL** separados por serviço, além de **Docker Compose** para orquestração de ambiente e **GitHub Actions + SonarCloud** para CI/CD e qualidade.
---
## 🏗 Visão Geral da Arquitetura

O sistema é composto por:
- **API Gateway (`api-gateway`)**  
  - Responsável por receber todas as requisições HTTP e roteá-las para o microserviço correto.
  - Implementado com **Traefik v3**.
- **Auth Service (`auth-service`)**  
  - Cadastro de usuários, login e geração de **tokens JWT**.  
  - Gerencia papéis de usuário (`ADMIN`, `USUARIO`, `SUPORTE`).
- **Directory Service (`directory-service`)**  
  - Cadastro de **setores** e **funcionários** (usuários “reais” que podem ser associados aos chamados).
- **Tickets Service (`tickets-service`)**  
  - CRUD de **chamados** (tickets) protegidos por autenticação.
  - Integra com o `directory-service` para validar responsáveis.
  - Possui testes automatizados com **Jest**.
- **Bancos PostgreSQL**  
  - Um banco por contexto:
    - `auth-db` para `auth-service`
    - `directory-db` para `directory-service`
    - `tickets-db` para `tickets-service`
- **Monitoring (`monitoring`)**  
  - Stack opcional com **Prometheus** e **Grafana** (arquivo `docker-compose.monitoring.yml`).
---
## 📂 Estrutura de Pastas (resumo)

```text
├── api-gateway/                 # API Gateway (Traefik)
├── auth-service/                # Serviço de autenticação (JWT)
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── sql/                     # Scripts SQL do serviço
├── directory-service/           # Serviço de diretório (setores e funcionários)
│   ├── controllers/
│   ├── routes/
│   └── sql/
├── tickets-service/             # Serviço de chamados
│   ├── controllers/
│   ├── repositories/
│   ├── services/
│   ├── tests/                   # Testes Jest
│   └── sql/
├── monitoring/
│   └── prometheus.yml
├── docker-compose.yml           # Ambiente local (build das imagens)
├── docker-compose.homolog.yml   # Ambiente de homolog (imagens do Docker Hub)
├── docker-compose.monitoring.yml
├── .github/workflows/ci.yml     # Pipeline CI/CD
└── sonar-project.properties     # Configuração SonarCloud
```
---
## 🧰 Tecnologias Utilizadas
| Categoria      | Ferramentas            |
| -------------- | ---------------------- |
| Backend        | Node.js, Express       |
| Arquitetura    | Microserviços          |
| API Gateway    | Traefik v3             |
| Autenticação   | JWT, bcryptjs          |
| Banco de Dados | PostgreSQL             |
| Orquestração   | Docker, Docker Compose |
| Testes         | Jest                   |
| Qualidade      | SonarCloud             |
| CI/CD          | GitHub Actions         |
| Monitoramento  | Prometheus, Grafana    |

---
## ✅ Pré-requisitos
- Docker
- Docker Compose
- (Opcional) Node.js 20+ e npm, caso queira rodar algum serviço manualmente.
---
## 🚀 Como Executar o Projeto com Docker (Ambiente Local)
### 1. Clonar o repositório
```sql
git clone <URL_DO_REPOSITORIO>
cd arquitetura-de-microservicos-main
```

### 2. Subir todos os serviços
```sql
docker compose up -d
```
Esse comando:
Constrói e sobe os microserviços, sobe os bancos PostgreSQL, executa automaticamente os scripts SQL de cada serviço e inicia o Traefik como API Gateway

### 3. Verificar containers ativos
```sql
docker compose ps
```

### 4. Endpoints principais
| Serviço              | URL                                        |
| -------------------- | ------------------------------------------ |
| API Gateway (base)   | `http://localhost:8081`                    |
| Traefik Dashboard    | `http://localhost:8082`                    |
| Auth Service Swagger | `http://localhost:8081/auth/api-docs`      |
| Directory Swagger    | `http://localhost:8081/directory/api-docs` |
| Tickets Swagger      | `http://localhost:8081/tickets/api-docs`   |

---
### 5. Encerrar os serviços
```sql
docker compose down
```
Para remover também os dados dos bancos:
```sql
docker compose down -v
```
---
## 🌐 Ambiente de Homologação (imagens do Docker Hub)
Para subir o ambiente utilizando as imagens publicadas no Docker Hub:
```sql
docker compose -f docker-compose.homolog.yml up -d
```
---
## 📊 Monitoramento (opcional)
Para subir Prometheus + Grafana:
```sql
docker compose -f docker-compose.monitoring.yml up -d
```
- Prometheus → http://localhost:9090
- Grafana → http://localhost:3000
---
## 🧭 Fluxo de Uso da API
<details>
  <summary><strong>📬 Collection do Postman</strong></summary>
  [Clique aqui para baixar](./docs/postman_collection.json)
</details>

<details>
  <summary><strong>📄 Documento Completo do Projeto (PDF)</strong></summary>
  [Clique aqui para abrir](./docs/documento_projeto.pdf)
</details>
---

## 🧪 Testes Automatizados (Tickets Service)
Os testes estão configurados no tickets-service utilizando Jest.
```sql
cd tickets-service
npm install
npm test
```
---
## 🔄 CI/CD — GitHub Actions + SonarCloud
O projeto possui um pipeline de CI/CD configurado em .github/workflows/ci.yml, que realiza:
Execução dos testes automatizados do tickets-service
Análise de qualidade de código no SonarCloud
Build das imagens Docker dos serviços
Publicação das imagens no Docker Hub com tags (latest e SHA do commit)
A configuração do SonarCloud é feita via sonar-project.properties.

### ▶️ Como Rodar o SonarCloud Localmente (Exatamente Igual ao Pipeline do Projeto)

Você pode rodar a análise do SonarCloud localmente, exatamente da mesma forma que o pipeline CI/CD faz no GitHub Actions.
Esse processo permite validar a qualidade do código antes de enviar para o repositório.

🧰 Pré-requisitos

Antes de rodar o Sonar, você precisa:
1️⃣ Ter Node.js 20+ instalado
Verifique com:
```sql
node -v
```
2️⃣ Instalar o SonarScanner via NPM
```sql
npm install -g sonar-scanner
```

3️⃣ Criar o token do SonarCloud

Acesse:
```sql
https://sonarcloud.io
Profile > Security > Generate Token
```
Guarde o token, você vai usá-lo no comando.

4️⃣ O arquivo sonar-project.properties já está configurado na raiz
Este arquivo é utilizado tanto pelo pipeline quanto pelo scanner local:
Exemplo (do jeito que está no teu projeto):

```sql
sonar.projectKey=SEU_PROJECT_KEY
sonar.organization=SEU_ORGANIZATION
sonar.sourceEncoding=UTF-8
sonar.sources=.
sonar.exclusions=**/node_modules/**, **/tests/**
sonar.javascript.lcov.reportPaths=tickets-service/coverage/lcov.info
```
| Ou seja: a análise é executada na raiz e considera todos os microserviços.

▶️ Passo a Passo para Rodar o Sonar Localmente
1️⃣ Vá até a raiz do projeto
```sql
cd arquitetura-de-microservicos-main
```

2️⃣ Gere a cobertura de testes do Tickets Service (igual ao pipeline)
```sql
cd tickets-service
npm install
npm test -- --coverage
cd ..
```

Isso cria:
```sql
tickets-service/coverage/lcov.info
```
O SonarCloud vai usar exatamente este arquivo.

3️⃣ Execute a análise na raiz do projeto
```sql
sonar-scanner -Dsonar.token=SEU_TOKEN
```

📌 O que este comando faz?

Analisa TODOS os microserviços (auth, directory, tickets, gateway)
Usa as configurações do sonar-project.properties exatamente como no pipeline
Envia a cobertura dos testes do tickets-service
Gera a mesma análise que seu GitHub Actions enviaria

### 📊 Verificando o Resultado

Após rodar o comando, acesse:
```sql
https://sonarcloud.io/project/overview?id=SEU_PROJECT_KEY
```
Você verá:
- Bugs
- Vulnerabilidades
- Code Smells
- Cobertura
- Duplicações
- Hotspots

### 🧩 Importante

Não é necessário iniciar Docker, serviços ou bancos para rodar o Sonar.
Basta ter o código + testes funcionando.


